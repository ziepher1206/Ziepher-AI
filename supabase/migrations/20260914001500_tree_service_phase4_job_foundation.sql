-- Tree Service Phase 4: field statuses, structured readiness, change orders, and completion proof.

alter type public.operate_job_status add value if not exists 'en_route' after 'scheduled';
alter type public.operate_job_status add value if not exists 'arrived' after 'en_route';
alter type public.operate_job_status add value if not exists 'weather_delay' after 'active';

alter table public.jobs
  add column if not exists required_equipment text[] not null default '{}'::text[],
  add column if not exists power_line_hazard boolean not null default false,
  add column if not exists traffic_control_required boolean not null default false,
  add column if not exists structure_risk boolean not null default false,
  add column if not exists weather_sensitive boolean not null default false,
  add column if not exists completion_work_verified boolean not null default false,
  add column if not exists completion_cleanup_verified boolean not null default false,
  add column if not exists completion_notes text,
  add column if not exists completion_verified_at timestamptz,
  add column if not exists completion_verified_by uuid references auth.users(id) on delete set null;

create index if not exists jobs_completion_verified_by_idx
  on public.jobs(completion_verified_by) where completion_verified_by is not null;

create table if not exists public.operate_job_change_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  job_id uuid not null,
  description text not null,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  status text not null default 'draft' check (status in ('draft','approved','rejected','canceled')),
  approval_method text check (approval_method is null or approval_method in ('customer_in_person','customer_phone','customer_email','other')),
  approved_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operate_job_change_orders_job_workspace_fk
    foreign key (job_id, workspace_id)
    references public.jobs(id, workspace_id)
    on delete cascade,
  check (char_length(trim(description)) between 1 and 4000),
  check ((status = 'approved' and approved_at is not null and approval_method is not null) or status <> 'approved')
);

create index if not exists operate_job_change_orders_job_workspace_idx
  on public.operate_job_change_orders(job_id, workspace_id, created_at desc);
create index if not exists operate_job_change_orders_created_by_idx
  on public.operate_job_change_orders(created_by);

create trigger operate_job_change_orders_set_updated_at
before update on public.operate_job_change_orders
for each row execute function public.set_updated_at();

alter table public.operate_job_change_orders enable row level security;

create policy "Workspace members can read job change orders"
on public.operate_job_change_orders for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can add job change orders"
on public.operate_job_change_orders for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));

create policy "Workspace members can update job change orders"
on public.operate_job_change_orders for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace admins can delete job change orders"
on public.operate_job_change_orders for delete to authenticated
using (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = (select auth.uid())
    where w.id = workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner','admin'))
  )
);
