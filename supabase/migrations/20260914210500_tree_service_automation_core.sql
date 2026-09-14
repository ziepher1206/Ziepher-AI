create table if not exists public.operate_automation_policies (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  auto_qualify_leads boolean not null default true,
  auto_prepare_estimates boolean not null default true,
  auto_create_jobs_from_accepted_estimates boolean not null default true,
  auto_prepare_invoices boolean not null default true,
  auto_prepare_review_followups boolean not null default true,
  auto_prepare_growth_actions boolean not null default true,
  auto_schedule_appointments boolean not null default false,
  auto_assign_crews boolean not null default false,
  auto_send_customer_messages boolean not null default false,
  auto_publish_marketing boolean not null default false,
  auto_charge_payments boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.operate_automation_policies enable row level security;

create policy operate_automation_policies_select_member
on public.operate_automation_policies
for select to authenticated
using (public.is_workspace_member(workspace_id));

create table if not exists public.operate_automation_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_key text not null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  status text not null default 'pending' check (status in ('pending','processing','completed','blocked','failed')),
  risk_level text not null default 'internal' check (risk_level in ('internal','approval','external')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, event_key)
);

create index if not exists operate_automation_events_pending_idx
on public.operate_automation_events (status, next_attempt_at, created_at)
where status in ('pending','failed');

create index if not exists operate_automation_events_workspace_idx
on public.operate_automation_events (workspace_id, created_at desc);

alter table public.operate_automation_events enable row level security;

create policy operate_automation_events_select_member
on public.operate_automation_events
for select to authenticated
using (public.is_workspace_member(workspace_id));

revoke insert, update, delete on public.operate_automation_policies from anon, authenticated;
revoke insert, update, delete on public.operate_automation_events from anon, authenticated;

grant select on public.operate_automation_policies to authenticated;
grant select on public.operate_automation_events to authenticated;
