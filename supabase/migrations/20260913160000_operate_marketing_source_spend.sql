create table if not exists public.marketing_source_spend (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source text not null check (char_length(trim(source)) between 1 and 120),
  period_start date not null,
  period_end date not null,
  amount_cents integer not null check (amount_cents >= 0),
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  constraint marketing_source_spend_creator_workspace_fk foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id) on delete restrict
);
create index if not exists marketing_source_spend_workspace_source_period_idx on public.marketing_source_spend (workspace_id, source, period_start, period_end);
create trigger marketing_source_spend_set_updated_at before update on public.marketing_source_spend for each row execute function public.set_updated_at();
alter table public.marketing_source_spend enable row level security;
create policy "Workspace members can read marketing spend" on public.marketing_source_spend for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "Workspace admins can manage marketing spend" on public.marketing_source_spend for all to authenticated
using (exists (select 1 from public.workspaces w left join public.workspace_members wm on wm.workspace_id=w.id and wm.user_id=auth.uid() where w.id=marketing_source_spend.workspace_id and (w.owner_id=auth.uid() or wm.role in ('owner','admin'))))
with check (exists (select 1 from public.workspaces w left join public.workspace_members wm on wm.workspace_id=w.id and wm.user_id=auth.uid() where w.id=marketing_source_spend.workspace_id and (w.owner_id=auth.uid() or wm.role in ('owner','admin'))) and created_by=auth.uid());
