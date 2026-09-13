create table if not exists public.workspace_business_profiles (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  business_name text,
  phone text,
  email text,
  website_url text,
  service_area text,
  about text,
  owner_name text,
  years_in_business integer check (years_in_business is null or years_in_business between 0 and 250),
  emergency_service boolean not null default false,
  license_insurance_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspace_business_profiles_set_updated_at
before update on public.workspace_business_profiles
for each row execute function public.set_updated_at();

alter table public.workspace_business_profiles enable row level security;

create policy "Workspace members can read business profile"
on public.workspace_business_profiles for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace admins can manage business profile"
on public.workspace_business_profiles for all to authenticated
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = workspace_business_profiles.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner','admin'))
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = workspace_business_profiles.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner','admin'))
  )
);
