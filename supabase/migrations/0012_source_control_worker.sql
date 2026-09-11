-- Resumable source-control worker state.
-- A validated build may enqueue at most one source-control run. The worker leases
-- that durable run before any GitHub side effect and snapshots the source
-- artifact identity so recovery cannot silently switch inputs.

alter table public.source_control_runs
  add column if not exists source_storage_path text,
  add column if not exists source_sha256 text,
  add column if not exists worker_id text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists attempt_count integer not null default 0;

alter table public.source_control_runs
  add constraint source_control_runs_build_job_unique unique (build_job_id),
  add constraint source_control_runs_source_sha256_check
    check (source_sha256 is null or source_sha256 ~ '^[a-f0-9]{64}$'),
  add constraint source_control_runs_source_storage_path_check
    check (source_storage_path is null or char_length(source_storage_path) between 1 and 1000),
  add constraint source_control_runs_worker_id_check
    check (worker_id is null or char_length(worker_id) between 1 and 200),
  add constraint source_control_runs_attempt_count_check
    check (attempt_count between 0 and 1000);

create index if not exists source_control_runs_worker_claim_idx
  on public.source_control_runs(stage, lease_expires_at, created_at)
  where stage in ('queued', 'branch_created', 'changes_ready');

create or replace function public.claim_next_source_control_run(
  p_worker_id text,
  p_lease_seconds integer default 600
)
returns public.source_control_runs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.source_control_runs;
begin
  if char_length(trim(p_worker_id)) not between 1 and 200 then
    raise exception 'Invalid source-control worker id';
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
  set worker_id = trim(p_worker_id),
      heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 60)),
      attempt_count = attempt_count + 1,
      updated_at = now()
  where id = v_run.id
  returning * into v_run;

  return v_run;
end;
$$;

create or replace function public.heartbeat_source_control_run(
  p_run_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 600
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.source_control_runs
  set heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 60)),
      updated_at = now()
  where id = p_run_id
    and worker_id = p_worker_id
    and stage in ('queued', 'branch_created', 'changes_ready');

  if not found then
    raise exception 'Source-control worker lease not found';
  end if;
end;
$$;

revoke all on function public.claim_next_source_control_run(text, integer)
from public, anon, authenticated;
revoke all on function public.heartbeat_source_control_run(uuid, text, integer)
from public, anon, authenticated;

grant execute on function public.claim_next_source_control_run(text, integer)
to service_role;
grant execute on function public.heartbeat_source_control_run(uuid, text, integer)
to service_role;
