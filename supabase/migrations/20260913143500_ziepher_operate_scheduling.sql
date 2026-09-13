-- Ziepher Operate scheduling + work lifecycle.
-- Adapted from the strongest scheduling/tenant patterns in the archived service-business code.

create extension if not exists btree_gist with schema extensions;

create type public.operate_job_status as enum (
  'draft',
  'scheduled',
  'active',
  'paused',
  'completed',
  'canceled'
);

create type public.operate_estimate_status as enum (
  'draft',
  'scheduled',
  'completed',
  'sent',
  'accepted',
  'declined',
  'expired',
  'canceled'
);

create type public.operate_appointment_type as enum ('estimate', 'job', 'general');
create type public.operate_appointment_status as enum (
  'tentative',
  'confirmed',
  'in_progress',
  'completed',
  'canceled',
  'no_show'
);
create type public.operate_schedule_resource_type as enum ('workspace', 'user', 'crew');
create type public.operate_schedule_override_mode as enum ('open', 'block');

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null,
  property_id uuid,
  lead_id uuid,
  service_id uuid,
  estimator_user_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 180),
  notes text,
  status public.operate_estimate_status not null default 'draft',
  scheduled_at timestamptz,
  completed_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  constraint estimates_customer_workspace_fk
    foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id)
    on delete restrict,
  constraint estimates_property_workspace_fk
    foreign key (property_id, workspace_id)
    references public.properties(id, workspace_id)
    on delete restrict,
  constraint estimates_lead_workspace_fk
    foreign key (lead_id, workspace_id)
    references public.leads(id, workspace_id)
    on delete restrict,
  constraint estimates_service_workspace_fk
    foreign key (service_id, workspace_id)
    references public.services(id, workspace_id)
    on delete restrict,
  constraint estimates_estimator_workspace_fk
    foreign key (workspace_id, estimator_user_id)
    references public.workspace_members(workspace_id, user_id)
    on delete restrict
);

create table public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  estimate_id uuid not null,
  position integer not null default 0 check (position >= 0),
  description text not null check (char_length(trim(description)) between 1 and 500),
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  line_total_cents integer generated always as (
    round(quantity * unit_price_cents)::integer
  ) stored,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  constraint estimate_line_items_estimate_workspace_fk
    foreign key (estimate_id, workspace_id)
    references public.estimates(id, workspace_id)
    on delete cascade
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null,
  property_id uuid,
  lead_id uuid,
  estimate_id uuid,
  service_id uuid,
  assigned_crew_id uuid,
  assigned_owner_user_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  service_address text,
  status public.operate_job_status not null default 'draft',
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  estimated_value_cents integer check (estimated_value_cents is null or estimated_value_cents >= 0),
  final_value_cents integer check (final_value_cents is null or final_value_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  check (
    (planned_start_at is null and planned_end_at is null)
    or (planned_start_at is not null and planned_end_at > planned_start_at)
  ),
  check (
    (actual_start_at is null and actual_end_at is null)
    or (actual_start_at is not null and (actual_end_at is null or actual_end_at > actual_start_at))
  ),
  constraint jobs_customer_workspace_fk
    foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id)
    on delete restrict,
  constraint jobs_property_workspace_fk
    foreign key (property_id, workspace_id)
    references public.properties(id, workspace_id)
    on delete restrict,
  constraint jobs_lead_workspace_fk
    foreign key (lead_id, workspace_id)
    references public.leads(id, workspace_id)
    on delete restrict,
  constraint jobs_estimate_workspace_fk
    foreign key (estimate_id, workspace_id)
    references public.estimates(id, workspace_id)
    on delete restrict,
  constraint jobs_service_workspace_fk
    foreign key (service_id, workspace_id)
    references public.services(id, workspace_id)
    on delete restrict,
  constraint jobs_crew_workspace_fk
    foreign key (assigned_crew_id, workspace_id)
    references public.crews(id, workspace_id)
    on delete restrict,
  constraint jobs_owner_workspace_fk
    foreign key (workspace_id, assigned_owner_user_id)
    references public.workspace_members(workspace_id, user_id)
    on delete restrict
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid,
  property_id uuid,
  lead_id uuid,
  service_id uuid,
  job_id uuid,
  estimate_id uuid,
  assigned_user_id uuid,
  assigned_crew_id uuid,
  appointment_type public.operate_appointment_type not null,
  status public.operate_appointment_status not null default 'tentative',
  title text not null check (char_length(trim(title)) between 1 and 180),
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  preparation_buffer_minutes integer not null default 0
    check (preparation_buffer_minutes between 0 and 1440),
  cleanup_buffer_minutes integer not null default 0
    check (cleanup_buffer_minutes between 0 and 1440),
  occupied_during tstzrange not null default tstzrange(now(), now(), '[)'),
  booking_idempotency_key uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, booking_idempotency_key),
  check (ends_at > starts_at),
  check (assigned_user_id is not null or assigned_crew_id is not null),
  check (not (job_id is not null and estimate_id is not null)),
  constraint appointments_customer_workspace_fk
    foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id)
    on delete restrict,
  constraint appointments_property_workspace_fk
    foreign key (property_id, workspace_id)
    references public.properties(id, workspace_id)
    on delete restrict,
  constraint appointments_lead_workspace_fk
    foreign key (lead_id, workspace_id)
    references public.leads(id, workspace_id)
    on delete restrict,
  constraint appointments_service_workspace_fk
    foreign key (service_id, workspace_id)
    references public.services(id, workspace_id)
    on delete restrict,
  constraint appointments_job_workspace_fk
    foreign key (job_id, workspace_id)
    references public.jobs(id, workspace_id)
    on delete restrict,
  constraint appointments_estimate_workspace_fk
    foreign key (estimate_id, workspace_id)
    references public.estimates(id, workspace_id)
    on delete restrict,
  constraint appointments_user_workspace_fk
    foreign key (workspace_id, assigned_user_id)
    references public.workspace_members(workspace_id, user_id)
    on delete restrict,
  constraint appointments_crew_workspace_fk
    foreign key (assigned_crew_id, workspace_id)
    references public.crews(id, workspace_id)
    on delete restrict,
  constraint appointments_no_active_user_overlap
    exclude using gist (
      workspace_id with =,
      assigned_user_id with =,
      occupied_during with &&
    )
    where (
      assigned_user_id is not null
      and status in ('tentative', 'confirmed', 'in_progress')
    ),
  constraint appointments_no_active_crew_overlap
    exclude using gist (
      workspace_id with =,
      assigned_crew_id with =,
      occupied_during with &&
    )
    where (
      assigned_crew_id is not null
      and status in ('tentative', 'confirmed', 'in_progress')
    )
);

create or replace function public.set_operate_appointment_occupied_during()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.occupied_during := tstzrange(
    new.starts_at - new.preparation_buffer_minutes * interval '1 minute',
    new.ends_at + new.cleanup_buffer_minutes * interval '1 minute',
    '[)'
  );
  return new;
end;
$$;

revoke all on function public.set_operate_appointment_occupied_during() from public, anon, authenticated;

drop trigger if exists appointments_set_occupied_during on public.appointments;
create trigger appointments_set_occupied_during
before insert or update of starts_at, ends_at, preparation_buffer_minutes, cleanup_buffer_minutes
on public.appointments
for each row execute function public.set_operate_appointment_occupied_during();

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  resource_type public.operate_schedule_resource_type not null,
  resource_user_id uuid,
  resource_crew_id uuid,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at_local time not null,
  ends_at_local time not null,
  effective_from date,
  effective_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at_local > starts_at_local),
  check (effective_until is null or effective_from is null or effective_until >= effective_from),
  check (
    (resource_type = 'workspace' and resource_user_id is null and resource_crew_id is null)
    or (resource_type = 'user' and resource_user_id is not null and resource_crew_id is null)
    or (resource_type = 'crew' and resource_user_id is null and resource_crew_id is not null)
  ),
  constraint availability_rules_user_workspace_fk
    foreign key (workspace_id, resource_user_id)
    references public.workspace_members(workspace_id, user_id)
    on delete cascade,
  constraint availability_rules_crew_workspace_fk
    foreign key (resource_crew_id, workspace_id)
    references public.crews(id, workspace_id)
    on delete cascade
);

create table public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  resource_type public.operate_schedule_resource_type not null,
  resource_user_id uuid,
  resource_crew_id uuid,
  mode public.operate_schedule_override_mode not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (resource_type = 'workspace' and resource_user_id is null and resource_crew_id is null)
    or (resource_type = 'user' and resource_user_id is not null and resource_crew_id is null)
    or (resource_type = 'crew' and resource_user_id is null and resource_crew_id is not null)
  ),
  constraint schedule_overrides_user_workspace_fk
    foreign key (workspace_id, resource_user_id)
    references public.workspace_members(workspace_id, user_id)
    on delete cascade,
  constraint schedule_overrides_crew_workspace_fk
    foreign key (resource_crew_id, workspace_id)
    references public.crews(id, workspace_id)
    on delete cascade,
  constraint schedule_overrides_creator_workspace_fk
    foreign key (workspace_id, created_by)
    references public.workspace_members(workspace_id, user_id)
    on delete restrict
);

create index estimates_workspace_status_idx
  on public.estimates (workspace_id, status, scheduled_at);
create index estimate_line_items_estimate_position_idx
  on public.estimate_line_items (workspace_id, estimate_id, position);
create index jobs_workspace_status_idx
  on public.jobs (workspace_id, status, planned_start_at);
create index appointments_workspace_starts_idx
  on public.appointments (workspace_id, starts_at);
create index availability_rules_workspace_day_idx
  on public.availability_rules (workspace_id, day_of_week)
  where active;
create index schedule_overrides_workspace_starts_idx
  on public.schedule_overrides (workspace_id, starts_at);

create trigger estimates_set_updated_at before update on public.estimates
for each row execute function public.set_updated_at();
create trigger estimate_line_items_set_updated_at before update on public.estimate_line_items
for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs
for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();
create trigger availability_rules_set_updated_at before update on public.availability_rules
for each row execute function public.set_updated_at();
create trigger schedule_overrides_set_updated_at before update on public.schedule_overrides
for each row execute function public.set_updated_at();

alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.jobs enable row level security;
alter table public.appointments enable row level security;
alter table public.availability_rules enable row level security;
alter table public.schedule_overrides enable row level security;

create policy "Workspace members can operate estimates"
on public.estimates for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can operate estimate line items"
on public.estimate_line_items for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can operate jobs"
on public.jobs for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can operate appointments"
on public.appointments for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can read availability rules"
on public.availability_rules for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "Workspace members can read schedule overrides"
on public.schedule_overrides for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace admins can manage availability rules"
on public.availability_rules for all to authenticated
using (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = availability_rules.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = availability_rules.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
);

create policy "Workspace admins can manage schedule overrides"
on public.schedule_overrides for all to authenticated
using (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = schedule_overrides.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = schedule_overrides.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
);

revoke all on public.estimates, public.estimate_line_items, public.jobs,
  public.appointments, public.availability_rules, public.schedule_overrides from anon;

grant select, insert, update, delete on public.estimates, public.estimate_line_items,
  public.jobs, public.appointments to authenticated;
grant select, insert, update, delete on public.availability_rules, public.schedule_overrides
  to authenticated;
