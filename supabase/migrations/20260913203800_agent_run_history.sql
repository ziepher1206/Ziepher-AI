create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  brief text not null,
  mode text not null default 'dry_run' check (mode in ('dry_run','live')),
  status text not null default 'queued' check (status in ('queued','running','completed','blocked','failed','cancelled')),
  agent_count integer not null default 0 check (agent_count >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  blocked_count integer not null default 0 check (blocked_count >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  provider_cost_usd numeric(12,6) not null default 0 check (provider_cost_usd >= 0),
  customer_usage_usd numeric(12,6) not null default 0 check (customer_usage_usd >= 0),
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_id text not null,
  agent_name text not null,
  agent_title text not null,
  sequence integer not null check (sequence > 0),
  status text not null default 'queued' check (status in ('queued','running','completed','blocked','failed','skipped')),
  feedback text,
  decision text,
  blockers jsonb not null default '[]'::jsonb,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  provider_cost_usd numeric(12,6) not null default 0 check (provider_cost_usd >= 0),
  model text,
  provider text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (run_id, agent_id),
  unique (run_id, sequence)
);

create index if not exists agent_runs_workspace_created_idx on public.agent_runs(workspace_id, created_at desc);
create index if not exists agent_runs_project_created_idx on public.agent_runs(project_id, created_at desc) where project_id is not null;
create index if not exists agent_run_steps_run_sequence_idx on public.agent_run_steps(run_id, sequence);

alter table public.agent_runs enable row level security;
alter table public.agent_run_steps enable row level security;

grant select, insert, update on public.agent_runs to authenticated;
grant select, insert, update on public.agent_run_steps to authenticated;
revoke all on public.agent_runs from anon;
revoke all on public.agent_run_steps from anon;

drop policy if exists agent_runs_select_member on public.agent_runs;
create policy agent_runs_select_member on public.agent_runs for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists agent_runs_insert_member on public.agent_runs;
create policy agent_runs_insert_member on public.agent_runs for insert to authenticated
with check (public.is_workspace_member(workspace_id) and requested_by = (select auth.uid()));

drop policy if exists agent_runs_update_member on public.agent_runs;
create policy agent_runs_update_member on public.agent_runs for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists agent_steps_select_member on public.agent_run_steps;
create policy agent_steps_select_member on public.agent_run_steps for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists agent_steps_insert_member on public.agent_run_steps;
create policy agent_steps_insert_member on public.agent_run_steps for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.agent_runs r
    where r.id = run_id and r.workspace_id = workspace_id and r.requested_by = (select auth.uid())
  )
);

drop policy if exists agent_steps_update_member on public.agent_run_steps;
create policy agent_steps_update_member on public.agent_run_steps for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
