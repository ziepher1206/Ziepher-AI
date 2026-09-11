-- Durable source-control orchestration ledger.
-- Service-role only: browser roles cannot read or mutate this control plane.

create table if not exists public.source_control_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  build_job_id uuid references public.build_jobs(id) on delete set null,
  repository_full_name text not null,
  base_branch text not null default 'main',
  working_branch text not null,
  base_sha text,
  head_sha text,
  pull_request_number integer,
  preview_url text,
  stage text not null default 'queued',
  revision bigint not null default 0,
  blocked_reason text,
  last_error text,
  approved_at timestamptz,
  merged_at timestamptz,
  production_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_control_runs_repository_format
    check (repository_full_name ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  constraint source_control_runs_stage_check
    check (stage in (
      'queued','branch_created','changes_ready','pull_request_open',
      'checks_running','preview_ready','approved','merged',
      'production_verified','blocked','failed'
    )),
  constraint source_control_runs_pr_number_check
    check (pull_request_number is null or pull_request_number > 0)
);

create unique index if not exists source_control_runs_project_working_branch_uidx
  on public.source_control_runs(project_id, working_branch);

create index if not exists source_control_runs_project_created_idx
  on public.source_control_runs(project_id, created_at desc);

create index if not exists source_control_runs_active_stage_idx
  on public.source_control_runs(stage, updated_at)
  where stage not in ('production_verified', 'failed');

alter table public.source_control_runs enable row level security;

revoke all on table public.source_control_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.source_control_runs to service_role;

create or replace function public.transition_source_control_run(
  p_run_id uuid,
  p_expected_revision bigint,
  p_from_stage text,
  p_to_stage text,
  p_head_sha text default null,
  p_pull_request_number integer default null,
  p_preview_url text default null,
  p_blocked_reason text default null,
  p_last_error text default null
)
returns public.source_control_runs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result public.source_control_runs;
  v_allowed boolean;
begin
  v_allowed := p_from_stage = p_to_stage or case p_from_stage
    when 'queued' then p_to_stage in ('branch_created','blocked','failed')
    when 'branch_created' then p_to_stage in ('changes_ready','blocked','failed')
    when 'changes_ready' then p_to_stage in ('pull_request_open','blocked','failed')
    when 'pull_request_open' then p_to_stage in ('checks_running','preview_ready','blocked','failed')
    when 'checks_running' then p_to_stage in ('checks_running','preview_ready','blocked','failed')
    when 'preview_ready' then p_to_stage in ('approved','checks_running','blocked','failed')
    when 'approved' then p_to_stage in ('merged','blocked','failed')
    when 'merged' then p_to_stage in ('production_verified','blocked','failed')
    when 'production_verified' then false
    when 'blocked' then p_to_stage in ('queued','branch_created','changes_ready','pull_request_open','checks_running','preview_ready','failed')
    when 'failed' then p_to_stage = 'queued'
    else false
  end;

  if not v_allowed then
    raise exception 'Invalid source-control transition: % -> %', p_from_stage, p_to_stage;
  end if;

  update public.source_control_runs
  set stage = p_to_stage,
      revision = revision + 1,
      head_sha = coalesce(p_head_sha, head_sha),
      pull_request_number = coalesce(p_pull_request_number, pull_request_number),
      preview_url = coalesce(p_preview_url, preview_url),
      blocked_reason = case when p_to_stage = 'blocked' then p_blocked_reason else null end,
      last_error = p_last_error,
      approved_at = case when p_to_stage = 'approved' then now() else approved_at end,
      merged_at = case when p_to_stage = 'merged' then now() else merged_at end,
      production_verified_at = case when p_to_stage = 'production_verified' then now() else production_verified_at end,
      updated_at = now()
  where id = p_run_id
    and revision = p_expected_revision
    and stage = p_from_stage
  returning * into v_result;

  if v_result.id is null then
    raise exception 'Source-control run changed concurrently or stage no longer matches';
  end if;

  return v_result;
end;
$$;

revoke all on function public.transition_source_control_run(
  uuid,bigint,text,text,text,integer,text,text,text
) from public, anon, authenticated;
grant execute on function public.transition_source_control_run(
  uuid,bigint,text,text,text,integer,text,text,text
) to service_role;
