-- Give source-control workers exclusive, recoverable ownership of provider side effects.

alter table public.source_control_runs
  add column if not exists worker_id text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists heartbeat_at timestamptz;

create index if not exists source_control_runs_claim_idx
  on public.source_control_runs(stage, lease_expires_at, created_at)
  where stage = 'queued';

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
  where stage = 'queued'
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

create or replace function public.complete_source_control_branch_creation(
  p_run_id uuid,
  p_worker_id text,
  p_expected_revision bigint,
  p_base_sha text
)
returns public.source_control_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.source_control_runs;
begin
  if p_base_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'A full base commit SHA is required';
  end if;

  update public.source_control_runs
  set stage = 'branch_created',
      revision = revision + 1,
      base_sha = lower(p_base_sha),
      head_sha = lower(p_base_sha),
      worker_id = null,
      lease_expires_at = null,
      heartbeat_at = now(),
      blocked_reason = null,
      last_error = null,
      updated_at = now()
  where id = p_run_id
    and stage = 'queued'
    and revision = p_expected_revision
    and worker_id = p_worker_id
    and lease_expires_at >= now()
  returning * into v_run;

  if v_run.id is null then
    raise exception 'Source-control lease changed, expired, or stage no longer matches';
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
    and stage = 'queued'
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
revoke all on function public.complete_source_control_branch_creation(uuid, text, bigint, text) from public, anon, authenticated;
revoke all on function public.block_source_control_run_worker(uuid, text, bigint, text) from public, anon, authenticated;

grant execute on function public.claim_next_source_control_run(text, integer) to service_role;
grant execute on function public.complete_source_control_branch_creation(uuid, text, bigint, text) to service_role;
grant execute on function public.block_source_control_run_worker(uuid, text, bigint, text) to service_role;
