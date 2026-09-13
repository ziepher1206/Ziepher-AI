create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  campaign_type text not null default 'website_promotion',
  status text not null default 'draft',
  instructions text,
  offer_details jsonb not null default '{}'::jsonb,
  channels text[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  requires_financial_approval boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  campaign_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_campaigns_date_order check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

alter table public.marketing_campaigns enable row level security;

create index if not exists marketing_campaigns_project_status_idx on public.marketing_campaigns (project_id, status, created_at desc);
create index if not exists marketing_campaigns_workspace_idx on public.marketing_campaigns (workspace_id);

create policy marketing_campaigns_select_member on public.marketing_campaigns
  for select to authenticated
  using (public.is_project_member(project_id));

create policy marketing_campaigns_insert_member on public.marketing_campaigns
  for insert to authenticated
  with check (public.is_project_member(project_id) and (created_by is null or created_by = (select auth.uid())));

create policy marketing_campaigns_update_member on public.marketing_campaigns
  for update to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

create policy marketing_campaigns_delete_member on public.marketing_campaigns
  for delete to authenticated
  using (public.is_project_member(project_id));

grant select, insert, update, delete on public.marketing_campaigns to authenticated;
revoke all on public.marketing_campaigns from anon;
