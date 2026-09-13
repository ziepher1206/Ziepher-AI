-- Phase 1 foundation: append-only workspace audit trail for important admin changes.

create table if not exists public.operate_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null,
  action text not null check (char_length(action) between 1 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operate_audit_events_workspace_created_idx
  on public.operate_audit_events (workspace_id, created_at desc);

create index if not exists operate_audit_events_actor_created_idx
  on public.operate_audit_events (actor_user_id, created_at desc);

alter table public.operate_audit_events enable row level security;

revoke all on table public.operate_audit_events from public, anon;
grant select, insert on table public.operate_audit_events to authenticated;

drop policy if exists operate_audit_events_select_member on public.operate_audit_events;
create policy operate_audit_events_select_member
  on public.operate_audit_events
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists operate_audit_events_insert_self on public.operate_audit_events;
create policy operate_audit_events_insert_self
  on public.operate_audit_events
  for insert
  to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and public.is_workspace_member(workspace_id)
  );

-- Intentionally no UPDATE or DELETE policies: audit rows are append-only to app users.
comment on table public.operate_audit_events is
  'Append-only audit events for Ziepher Operate administrative changes.';
