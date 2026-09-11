-- Gate PR approval on the exact GitHub head, successful checks, and a real
-- Vercel preview deployment. Polling is delayed in Postgres so an idle worker
-- cannot hot-loop provider APIs.

alter table public.source_control_runs
  add column if not exists preview_deployment_id uuid
    references public.deployments(id) on delete set null,
  add column if not exists next_check_at timestamptz;

create unique index if not exists source_control_runs_preview_deployment_uidx
  on public.source_control_runs(preview_deployment_id)
  where preview_deployment_id is not null;

drop index if exists public.source_control_runs_claim_idx;
create index source_control_runs_claim_idx
  on public.source_control_runs(stage, next_check_at, lease_expires_at, created_at)
  where stage in (
    'queued', 'branch_created', 'changes_ready',
    'pull_request_open', 'checks_running'
  );

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
      'pull_request_open', 'checks_running'
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

create or replace function public.reschedule_source_control_checks(
  p_run_id uuid,
  p_worker_id text,
  p_expected_revision bigint,
  p_pull_request_number integer,
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
  if p_pull_request_number < 1 then
    raise exception 'A valid pull request number is required';
  end if;
  if p_head_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'A full head commit SHA is required';
  end if;

  update public.source_control_runs
  set stage = 'checks_running',
      revision = revision + 1,
      worker_id = null,
      lease_expires_at = null,
      heartbeat_at = now(),
      next_check_at = now() + make_interval(secs => greatest(p_delay_seconds, 15)),
      blocked_reason = null,
      last_error = case
        when p_last_error is null then null
        else left(p_last_error, 2000)
      end,
      updated_at = now()
  where id = p_run_id
    and stage in ('pull_request_open', 'checks_running')
    and revision = p_expected_revision
    and worker_id = p_worker_id
    and lease_expires_at >= now()
    and pull_request_number = p_pull_request_number
    and head_sha = lower(p_head_sha)
  returning * into v_run;

  if v_run.id is null then
    raise exception 'Source-control lease/head/PR changed, expired, or stage no longer matches';
  end if;

  return v_run;
end;
$$;

create or replace function public.queue_source_control_preview_deployment(
  p_run_id uuid,
  p_worker_id text,
  p_expected_revision bigint,
  p_pull_request_number integer,
  p_head_sha text,
  p_delay_seconds integer default 20
)
returns public.source_control_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.source_control_runs;
  v_version_text text;
  v_project_version_id uuid;
  v_requested_by uuid;
  v_deployment_id uuid;
begin
  if p_pull_request_number < 1 then
    raise exception 'A valid pull request number is required';
  end if;
  if p_head_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'A full head commit SHA is required';
  end if;

  select * into v_run
  from public.source_control_runs
  where id = p_run_id
    and stage in ('pull_request_open', 'checks_running')
    and revision = p_expected_revision
    and worker_id = p_worker_id
    and lease_expires_at >= now()
    and pull_request_number = p_pull_request_number
    and head_sha = lower(p_head_sha)
  for update;

  if v_run.id is null then
    raise exception 'Source-control lease/head/PR changed, expired, or stage no longer matches';
  end if;
  if v_run.build_job_id is null then
    raise exception 'Source-control run is missing its build job identity';
  end if;

  v_deployment_id := v_run.preview_deployment_id;

  if v_deployment_id is null then
    select a.metadata ->> 'version'
      into v_version_text
    from public.artifacts a
    where a.project_id = v_run.project_id
      and a.build_job_id = v_run.build_job_id
      and a.artifact_type = 'source_archive'
    limit 1;

    if v_version_text is null or v_version_text !~ '^[1-9][0-9]*$' then
      raise exception 'Published build version metadata is missing or invalid';
    end if;

    select pv.id into v_project_version_id
    from public.project_versions pv
    where pv.project_id = v_run.project_id
      and pv.version = v_version_text::integer;

    if v_project_version_id is null then
      raise exception 'Published project version was not found';
    end if;

    select bj.requested_by into v_requested_by
    from public.build_jobs bj
    where bj.id = v_run.build_job_id
      and bj.project_id = v_run.project_id;

    if v_requested_by is null then
      raise exception 'Build requester was not found';
    end if;

    if exists (
      select 1
      from public.integration_gates
      where project_id = v_run.project_id
        and enabled_at is not null
        and (
          test_mode_verified is false
          or auth_verified is false
          or authorization_verified is false
          or rls_verified is false
          or (
            integration_type in ('stripe', 'banking', 'payouts')
            and (
              webhook_verified is false
              or idempotency_verified is false
              or user_live_approval_at is null
            )
          )
        )
    ) then
      raise exception 'A financial or production-secret integration gate is incomplete';
    end if;

    insert into public.deployments (
      project_id,
      project_version_id,
      requested_by,
      provider,
      environment,
      status
    ) values (
      v_run.project_id,
      v_project_version_id,
      v_requested_by,
      'vercel',
      'preview',
      'queued'
    )
    returning id into v_deployment_id;
  else
    if not exists (
      select 1
      from public.deployments d
      where d.id = v_deployment_id
        and d.project_id = v_run.project_id
        and d.provider = 'vercel'
        and d.environment = 'preview'
    ) then
      raise exception 'Linked preview deployment does not match the source-control run';
    end if;
  end if;

  update public.source_control_runs
  set stage = 'checks_running',
      revision = revision + 1,
      preview_deployment_id = v_deployment_id,
      worker_id = null,
      lease_expires_at = null,
      heartbeat_at = now(),
      next_check_at = now() + make_interval(secs => greatest(p_delay_seconds, 15)),
      blocked_reason = null,
      last_error = null,
      updated_at = now()
  where id = v_run.id
  returning * into v_run;

  return v_run;
end;
$$;

create or replace function public.complete_source_control_preview_ready(
  p_run_id uuid,
  p_worker_id text,
  p_expected_revision bigint,
  p_pull_request_number integer,
  p_head_sha text
)
returns public.source_control_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.source_control_runs;
  v_preview_url text;
begin
  if p_pull_request_number < 1 then
    raise exception 'A valid pull request number is required';
  end if;
  if p_head_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'A full head commit SHA is required';
  end if;

  select * into v_run
  from public.source_control_runs
  where id = p_run_id
    and stage = 'checks_running'
    and revision = p_expected_revision
    and worker_id = p_worker_id
    and lease_expires_at >= now()
    and pull_request_number = p_pull_request_number
    and head_sha = lower(p_head_sha)
  for update;

  if v_run.id is null then
    raise exception 'Source-control lease/head/PR changed, expired, or stage no longer matches';
  end if;
  if v_run.preview_deployment_id is null then
    raise exception 'Source-control run has no linked preview deployment';
  end if;

  select d.url into v_preview_url
  from public.deployments d
  where d.id = v_run.preview_deployment_id
    and d.project_id = v_run.project_id
    and d.provider = 'vercel'
    and d.environment = 'preview'
    and d.status = 'ready'::public.deployment_status;

  if v_preview_url is null or v_preview_url !~ '^https://[^[:space:]]+$' then
    raise exception 'Linked Vercel preview is not ready with a valid HTTPS URL';
  end if;

  update public.source_control_runs
  set stage = 'preview_ready',
      revision = revision + 1,
      preview_url = v_preview_url,
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
      'pull_request_open', 'checks_running'
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

revoke all on function public.claim_next_source_control_run(text, integer) from public, anon, authenticated;
revoke all on function public.reschedule_source_control_checks(uuid, text, bigint, integer, text, integer, text) from public, anon, authenticated;
revoke all on function public.queue_source_control_preview_deployment(uuid, text, bigint, integer, text, integer) from public, anon, authenticated;
revoke all on function public.complete_source_control_preview_ready(uuid, text, bigint, integer, text) from public, anon, authenticated;
revoke all on function public.block_source_control_run_worker(uuid, text, bigint, text) from public, anon, authenticated;

grant execute on function public.claim_next_source_control_run(text, integer) to service_role;
grant execute on function public.reschedule_source_control_checks(uuid, text, bigint, integer, text, integer, text) to service_role;
grant execute on function public.queue_source_control_preview_deployment(uuid, text, bigint, integer, text, integer) to service_role;
grant execute on function public.complete_source_control_preview_ready(uuid, text, bigint, integer, text) to service_role;
grant execute on function public.block_source_control_run_worker(uuid, text, bigint, text) to service_role;
