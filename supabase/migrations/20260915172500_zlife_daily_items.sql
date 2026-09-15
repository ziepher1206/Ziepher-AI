-- Unified My Day stream for Z-Life.
-- Individual modules can publish normalized daily items here so the user can
-- see life + business in one place without copying each module's full data.

create table if not exists public.zlife_daily_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_module text not null,
  source_entity_type text,
  source_entity_id text,
  item_kind text not null check (item_kind in (
    'task',
    'appointment',
    'reminder',
    'payment_due',
    'subscription_due',
    'school',
    'shopping',
    'errand',
    'health',
    'business',
    'vehicle',
    'document',
    'family',
    'other'
  )),
  title text not null,
  detail text,
  status text not null default 'open' check (status in ('open', 'done', 'dismissed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  starts_at timestamptz,
  due_at timestamptz,
  action_href text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists zlife_daily_items_source_unique
  on public.zlife_daily_items (workspace_id, source_module, source_entity_type, source_entity_id)
  where source_entity_id is not null;

create index if not exists zlife_daily_items_workspace_due_idx
  on public.zlife_daily_items (workspace_id, status, due_at, starts_at);

create trigger zlife_daily_items_set_updated_at
before update on public.zlife_daily_items
for each row execute function public.set_updated_at();

alter table public.zlife_daily_items enable row level security;

create policy "Workspace members can read daily items"
on public.zlife_daily_items for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can create their daily items"
on public.zlife_daily_items for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = (select auth.uid()))
);

create policy "Workspace members can update daily items"
on public.zlife_daily_items for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can remove daily items"
on public.zlife_daily_items for delete to authenticated
using (public.is_workspace_member(workspace_id));

comment on table public.zlife_daily_items is
  'Normalized cross-module daily feed. Source modules keep ownership of their full records; My Day stores only the fields needed to surface and route daily attention.';
