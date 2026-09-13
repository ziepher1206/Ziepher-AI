alter table public.model_usage add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.model_usage add column if not exists customer_usage_usd numeric(12,6) not null default 0;
alter table public.model_usage add column if not exists usage_metadata jsonb not null default '{}'::jsonb;

create index if not exists model_usage_workspace_created_idx on public.model_usage (workspace_id, created_at desc);
create index if not exists model_usage_project_created_idx on public.model_usage (project_id, created_at desc);
