-- Extend provider-side source-control orchestration through pull-request creation.
-- The same lease/revision compare-and-swap protocol protects the GitHub side effect.

drop index if exists public.source_control_runs_claim_idx;
create index source_control_runs_claim_idx
  on public.source_control_runs(stage, lease_expires_at, created_at)
  where stage in ('queued', 'branch_created', 'changes_ready');

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
  where stage in ('queued', 'branch_created', 'changes_ready')
    and (lease_expires_at is null or lease_expires_at < now())
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

create or replace function public.complete_source_control_pull_request_open(
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
begin
  if p_pull_request_number < 1 then
    raise exception 'A valid pull request number is required';
  end if;
  if p_head_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'A full head commit SHA is required';
  end if;

  update public.source_control_runs
  set stage = 'pull_request_open',
      revision = revision + 1,
      pull_request_number = p_pull_request_number,
      head_sha = lower(p_head_sha),
      worker_id = null,
      lease_expires_at = null,
      heartbeat_at = now(),
      blocked_reason = null,
      last_error = null,
      updated_at = now()
  where id = p_run_id
    and stage = 'changes_ready'
    and revision = p_expected_revision
    and worker_id = p_worker_id
    and lease_expires_at >= now()
    and head_sha = lower(p_head_sha)
  returning * into v_run;

  if v_run.id is null then
    raise exception 'Source-control lease/head changed, expired, or stage no longer matches';
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
      blocked_reason = left(coalesce(nullif(trim(p_reason), ''), 'Source-control provider action failed.'), 2000),
      last_error = left(coalesce(nullif(trim(p_reason), ''), 'Source-control provider action failed.'), 2000),
      updated_at = now()
  where id = p_run_id
    and stage in ('queued', 'branch_created', 'changes_ready')
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
revoke all on function public.complete_source_control_pull_request_open(uuid, text, bigint, integer, text) from public, anon, authenticated;
revoke all on function public.block_source_control_run_worker(uuid, text, bigint, text) from public, anon, authenticated;

grant execute on function public.claim_next_source_control_run(text, integer) to service_role;
grant execute on function public.complete_source_control_pull_request_open(uuid, text, bigint, integer, text) to service_role;
grant execute on function public.block_source_control_run_worker(uuid, text, bigint, text) to service_role;
