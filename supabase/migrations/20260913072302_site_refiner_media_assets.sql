create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  source_type text not null default 'upload',
  source_url text,
  storage_bucket text,
  storage_path text,
  display_name text not null,
  mime_type text,
  width integer,
  height integer,
  ai_tags text[] not null default '{}',
  ai_summary text,
  ai_score numeric(5,2),
  usage_status text not null default 'available',
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;

create index if not exists media_assets_project_created_idx on public.media_assets (project_id, created_at desc);
create index if not exists media_assets_workspace_idx on public.media_assets (workspace_id);

create policy media_assets_select_member on public.media_assets
  for select to authenticated
  using (public.is_project_member(project_id));

create policy media_assets_insert_member on public.media_assets
  for insert to authenticated
  with check (public.is_project_member(project_id) and (uploaded_by is null or uploaded_by = (select auth.uid())));

create policy media_assets_update_member on public.media_assets
  for update to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

create policy media_assets_delete_member on public.media_assets
  for delete to authenticated
  using (public.is_project_member(project_id));

grant select, insert, update, delete on public.media_assets to authenticated;
revoke all on public.media_assets from anon;
