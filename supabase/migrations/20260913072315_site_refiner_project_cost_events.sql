create table if not exists public.project_cost_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  category text not null,
  provider text,
  operation text not null,
  provider_cost_usd numeric(12,6) not null default 0,
  customer_usage_usd numeric(12,6) not null default 0,
  source_reference text,
  cost_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint project_cost_events_nonnegative_provider check (provider_cost_usd >= 0),
  constraint project_cost_events_nonnegative_customer check (customer_usage_usd >= 0)
);

alter table public.project_cost_events enable row level security;

create index if not exists project_cost_events_project_created_idx on public.project_cost_events (project_id, created_at desc);
create index if not exists project_cost_events_workspace_created_idx on public.project_cost_events (workspace_id, created_at desc);

create policy project_cost_events_select_member on public.project_cost_events
  for select to authenticated
  using (
    (project_id is not null and public.is_project_member(project_id))
    or (project_id is null and public.is_workspace_member(workspace_id))
  );

grant select on public.project_cost_events to authenticated;
revoke insert, update, delete on public.project_cost_events from authenticated;
revoke all on public.project_cost_events from anon;
