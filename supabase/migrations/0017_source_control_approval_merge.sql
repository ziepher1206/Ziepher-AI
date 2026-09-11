-- Add an auditable human approval boundary and a retry-safe merge worker stage.
-- Preview approval is owner/admin only. Production deployment remains a separate action.

alter table public.source_control_runs
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists merged_sha text;

alter table public.source_control_runs
  drop constraint if exists source_control_runs_merged_sha_check;
alter table public.source_control_runs
  add constraint source_control_runs_merged_sha_check
  check (merged_sha is null or merged_sha ~ '^[A-Fa-f0-9]{40}$');

drop index if exists public.source_control_runs_claim_idx;
create index source_control_runs_claim_idx
  on public.source_control_runs(stage, next_check_at, lease_expires_at, created_at)
  where stage in (
    'queued', 'branch_created', 'changes_ready',
    'pull_request_open', 'checks_running', 'approved'
  );

create or replace function public.approve_source_control_run(
  p_run_id uuid,
  p_expected_revision bigint,
  p_user_id uuid
)
returns public.source_control_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.source_control_runs;
  v_project public.projects;
  v_role text;
begin
  select * into v_run
  from public.source_control_runs
  where id = p_run_id
    and stage = 'preview_ready'
    and revision = p_expected_revision
  for update;

  if v_run.id is null then
    raise exception 'Source-control run changed concurrently or is not preview-ready';
  end if;

  if v_run.head_sha is null or v_run.head_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'Preview-ready run is missing a valid head SHA';
  end if;
  if v_run.pull_request_number is null or v_run.pull_request_number < 1 then
    raise exception 'Preview-ready run is missing a pull request';
  end if;
  if v_run.preview_url is null or v_run.preview_url !~ '^https://[^[:space:]]+$' then
    raise exception 'Preview-ready run is missing a valid preview URL';
  end if;
  if v_run.preview_deployment_id is null then
    raise exception 'Preview-ready run is missing its preview deployment';
  end if;

  select * into v_project
  from public.projects
  where id = v_run.project_id;

  if v_project.id is null then
    raise exception 'Project not found';
  end if;

  if v_project.owner_id <> p_user_id then
    if v_project.workspace_id is null then
      raise exception 'Approval access denied';
    end if;

    select wm.role into v_role
    from public.workspace_members wm
    where wm.workspace_id = v_project.workspace_id
      and wm.user_id = p_user_id;

    if v_role is null or v_role not in ('owner', 'admin') then
      raise exception 'Approval access denied';
    end if;
  end if;

  if not exists (
    select 1
    from public.deployments d
    where d.id = v_run.preview_deployment_id
      and d.project_id = v_run.project_id
      and d.provider = 'vercel'
      and d.environment = 'preview'
      and d.status = 'ready'::public.deployment_status
      and d.url = v_run.preview_url
  ) then
    raise exception 'Linked Vercel preview is no longer ready';
  end if;

  update public.source_control_runs
  set stage = 'approved',
      revision = revision + 1,
      approved_by = p_user_id,
      approved_at = now(),
      worker_id = null,
      lease_expires_at = null,
      heartbeat_at = now(),
      next_check_at = null,
      blocked_reason = null,
      last_error = null,
      updated_at = now()
  where id = v_run.id
  returning * into v_run;

  return v_run;
end;
$$;

create or replace function public.claim_next_source_control_run(
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns public.source_control_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.source_control_runs;
begin
  if nullif(trim(p_worker_id), '') is null then
    raise exception 'Worker id is required';
  end if;

  select * into v_run
  from public.source_control_runs
  where stage in (
      'queued', 'branch_created', 'changes_ready',
      'pull_request_open', 'checks_running', 'approved'
    )
    and (lease_expires_at is null or lease_expires_at < now())
    and (next_check_at is null or next_check_at <= now())
  order by created_at
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.source_control_runs
  set worker_id = p_worker_id,
      heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 60)),
      updated_at = now()
  where id = v_run.id
  returning * into v_run;

  return v_run;
end;
$$;

create or replace function public.reschedule_source_control_approved_merge(
  p_run_id uuid,
  p_worker_id text,
  p_expected_revision bigint,
  p_head_sha text,
  p_delay_seconds integer default 30,
  p_last_error text default null
)
returns public.source_control_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.source_control_runs;
begin
  if p_head_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'A full head commit SHA is required';
  end if;

  update public.source_control_runs
  set revision = revision + 1,
      worker_id = null,
      lease_expires_at = null,
      heartbeat_at = now(),
      next_check_at = now() + make_interval(secs => greatest(p_delay_seconds, 15)),
      last_error = case when p_last_error is null then null else left(p_last_error, 2000) end,
      updated_at = now()
  where id = p_run_id
    and stage = 'approved'
    and revision = p_expected_revision
    and worker_id = p_worker_id
    and lease_expires_at >= now()
    and head_sha = lower(p_head_sha)
    and approved_by is not null
  returning * into v_run;

  if v_run.id is null then
    raise exception 'Approved merge lease/head changed, expired, or stage no longer matches';
  end if;

  return v_run;
end;
$$;

create or replace function public.complete_source_control_merged(
  p_run_id uuid,
  p_worker_id text,
  p_expected_revision bigint,
  p_head_sha text,
  p_merge_sha text
)
returns public.source_control_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.source_control_runs;
begin
  if p_head_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'A full approved head SHA is required';
  end if;
  if p_merge_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'A full merge SHA is required';
  end if;

  update public.source_control_runs
  set stage = 'merged',
      revision = revision + 1,
      merged_sha = lower(p_merge_sha),
      merged_at = now(),
      worker_id = null,
      lease_expires_at = null,
      heartbeat_at = now(),
      next_check_at = null,
      blocked_reason = null,
      last_error = null,
      updated_at = now()
  where id = p_run_id
    and stage = 'approved'
    and revision = p_expected_revision
    and worker_id = p_worker_id
    and lease_expires_at >= now()
    and head_sha = lower(p_head_sha)
    and approved_by is not null
    and pull_request_number is not null
  returning * into v_run;

  if v_run.id is null then
    raise exception 'Approved merge lease/head changed, expired, or stage no longer matches';
  end if;

  return v_run;
end;
$$;

create or replace function public.block_source_control_run_worker(
  p_run_id uuid,
  p_worker_id text,
  p_expected_revision bigint,
  p_reason text
)
returns public.source_control_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.source_control_runs;
begin
  update public.source_control_runs
  set stage = 'blocked',
      revision = revision + 1,
      worker_id = null,
      lease_expires_at = null,
      heartbeat_at = now(),
      next_check_at = null,
      blocked_reason = left(coalesce(nullif(trim(p_reason), ''), 'Source-control provider action failed.'), 2000),
      last_error = left(coalesce(nullif(trim(p_reason), ''), 'Source-control provider action failed.'), 2000),
      updated_at = now()
  where id = p_run_id
    and stage in (
      'queued', 'branch_created', 'changes_ready',
      'pull_request_open', 'checks_running', 'approved'
    )
    and revision = p_expected_revision
    and worker_id = p_worker_id
  returning * into v_run;

  if v_run.id is null then
    raise exception 'Source-control lease changed or stage no longer matches';
  end if;

  return v_run;
end;
$$;

revoke all on function public.approve_source_control_run(uuid, bigint, uuid) from public, anon, authenticated;
revoke all on function public.claim_next_source_control_run(text, integer) from public, anon, authenticated;
revoke all on function public.reschedule_source_control_approved_merge(uuid, text, bigint, text, integer, text) from public, anon, authenticated;
revoke all on function public.complete_source_control_merged(uuid, text, bigint, text, text) from public, anon, authenticated;
revoke all on function public.block_source_control_run_worker(uuid, text, bigint, text) from public, anon, authenticated;

grant execute on function public.approve_source_control_run(uuid, bigint, uuid) to service_role;
grant execute on function public.claim_next_source_control_run(text, integer) to service_role;
grant execute on function public.reschedule_source_control_approved_merge(uuid, text, bigint, text, integer, text) to service_role;
grant execute on function public.complete_source_control_merged(uuid, text, bigint, text, text) to service_role;
grant execute on function public.block_source_control_run_worker(uuid, text, bigint, text) to service_role;
