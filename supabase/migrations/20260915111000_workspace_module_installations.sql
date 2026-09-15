create table if not exists public.zlife_module_catalog (
  module_key text primary key,
  name text not null,
  description text not null default '',
  route text not null,
  category text not null default 'general',
  status text not null default 'available' check (status in ('available', 'preview', 'hidden', 'retired')),
  is_core boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_module_installations (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  module_key text not null references public.zlife_module_catalog(module_key) on delete restrict,
  installed_by uuid not null references auth.users(id) on delete restrict,
  installed_at timestamptz not null default now(),
  settings jsonb not null default '{}'::jsonb,
  primary key (workspace_id, module_key)
);

alter table public.zlife_module_catalog enable row level security;
alter table public.workspace_module_installations enable row level security;

create policy "Authenticated users can read available module catalog"
on public.zlife_module_catalog for select to authenticated
using (status in ('available', 'preview'));

create policy "Workspace members can read installed modules"
on public.workspace_module_installations for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace owners and admins can install modules"
on public.workspace_module_installations for insert to authenticated
with check (
  installed_by = (select auth.uid())
  and exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
);

create policy "Workspace owners and admins can remove modules"
on public.workspace_module_installations for delete to authenticated
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
);

insert into public.zlife_module_catalog (module_key, name, description, route, category, status, is_core)
values
  ('tree_service', 'Tree Service', 'Run leads, estimates, jobs, scheduling, invoices, growth, and field-service workflows.', '/operate', 'business', 'available', false),
  ('home_family', 'Home & Family', 'Track household tasks, family needs, projects, reminders, and recurring home maintenance.', '/home', 'personal', 'available', false)
on conflict (module_key) do update set
  name = excluded.name,
  description = excluded.description,
  route = excluded.route,
  category = excluded.category,
  status = excluded.status,
  is_core = excluded.is_core,
  updated_at = now();
