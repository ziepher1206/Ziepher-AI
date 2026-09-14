-- Z-Life Home & Family foundation.
-- Uses the existing workspace boundary so household data inherits the same tenant model.

create table if not exists public.home_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  details text,
  category text not null default 'household' check (category in ('household','family','maintenance','project','reminder')),
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists home_tasks_workspace_status_due_idx
  on public.home_tasks (workspace_id, status, due_at);

alter table public.home_tasks enable row level security;

create policy home_tasks_select_member
on public.home_tasks
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy home_tasks_insert_member
on public.home_tasks
for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);

create policy home_tasks_update_member
on public.home_tasks
for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy home_tasks_delete_member
on public.home_tasks
for delete to authenticated
using (public.is_workspace_member(workspace_id));

create table if not exists public.home_maintenance_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  location text,
  cadence_days integer check (cadence_days is null or cadence_days between 1 and 3650),
  last_completed_at timestamptz,
  next_due_at timestamptz,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists home_maintenance_workspace_due_idx
  on public.home_maintenance_items (workspace_id, next_due_at);

alter table public.home_maintenance_items enable row level security;

create policy home_maintenance_select_member
on public.home_maintenance_items
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy home_maintenance_insert_member
on public.home_maintenance_items
for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);

create policy home_maintenance_update_member
on public.home_maintenance_items
for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy home_maintenance_delete_member
on public.home_maintenance_items
for delete to authenticated
using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.home_tasks to authenticated;
grant select, insert, update, delete on public.home_maintenance_items to authenticated;
