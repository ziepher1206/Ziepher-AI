create table if not exists public.operate_public_lead_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  label text not null default 'Website form' check (char_length(trim(label)) between 1 and 120),
  source text not null default 'Website' check (char_length(trim(source)) between 1 and 120),
  source_detail text,
  enabled boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operate_public_lead_sources_creator_workspace_fk
    foreign key (workspace_id, created_by)
    references public.workspace_members(workspace_id, user_id)
    on delete restrict
);

create index if not exists operate_public_lead_sources_workspace_enabled_idx
  on public.operate_public_lead_sources (workspace_id, enabled, created_at desc);

create trigger operate_public_lead_sources_set_updated_at
before update on public.operate_public_lead_sources
for each row execute function public.set_updated_at();

alter table public.operate_public_lead_sources enable row level security;

create policy "Workspace members can read public lead sources"
on public.operate_public_lead_sources for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace admins can manage public lead sources"
on public.operate_public_lead_sources for all to authenticated
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = operate_public_lead_sources.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner','admin'))
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = operate_public_lead_sources.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner','admin'))
  )
  and created_by = auth.uid()
);
