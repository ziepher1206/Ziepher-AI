-- Ziepher Operate foundation
-- First commercial vertical: tree-service businesses.
-- Reuses the existing Ziepher workspace/member model rather than importing
-- legacy organization/auth structures from archived applications.

create type public.operate_lead_status as enum (
  'new',
  'contacted',
  'qualified',
  'estimate_scheduled',
  'estimated',
  'won',
  'lost',
  'spam'
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 160),
  email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  notes text,
  sms_consent boolean not null default false,
  sms_consent_at timestamptz,
  sms_opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, workspace_id),
  check (email is not null or phone is not null),
  check (not sms_consent or sms_consent_at is not null),
  check (sms_opted_out_at is null or not sms_consent)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null,
  label text,
  address_line_1 text not null,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  access_notes text,
  hazard_notes text,
  tree_notes jsonb not null default '[]'::jsonb,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, workspace_id),
  constraint properties_customer_workspace_fk
    foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id)
    on delete restrict,
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  default_duration_minutes integer check (
    default_duration_minutes is null or default_duration_minutes between 1 and 10080
  ),
  preparation_buffer_minutes integer not null default 0
    check (preparation_buffer_minutes between 0 and 1440),
  cleanup_buffer_minutes integer not null default 0
    check (cleanup_buffer_minutes between 0 and 1440),
  base_price_cents integer check (base_price_cents is null or base_price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table public.crew_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  crew_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_lead boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (crew_id, user_id),
  constraint crew_members_crew_workspace_fk
    foreign key (crew_id, workspace_id)
    references public.crews(id, workspace_id)
    on delete cascade,
  constraint crew_members_workspace_user_fk
    foreign key (workspace_id, user_id)
    references public.workspace_members(workspace_id, user_id)
    on delete cascade
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid,
  property_id uuid,
  service_id uuid,
  contact_name text not null check (char_length(trim(contact_name)) between 1 and 160),
  email text,
  phone text,
  service_address text,
  message text,
  source text,
  source_detail text,
  status public.operate_lead_status not null default 'new',
  estimated_value_cents integer check (estimated_value_cents is null or estimated_value_cents >= 0),
  sms_consent boolean not null default false,
  sms_consent_at timestamptz,
  public_submission_id uuid,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, public_submission_id),
  check (email is not null or phone is not null),
  check (not sms_consent or sms_consent_at is not null),
  constraint leads_customer_workspace_fk
    foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id)
    on delete restrict,
  constraint leads_property_workspace_fk
    foreign key (property_id, workspace_id)
    references public.properties(id, workspace_id)
    on delete restrict,
  constraint leads_service_workspace_fk
    foreign key (service_id, workspace_id)
    references public.services(id, workspace_id)
    on delete restrict
);

create unique index customers_workspace_email_unique_idx
  on public.customers (workspace_id, lower(email))
  where email is not null and deleted_at is null;
create index customers_workspace_phone_idx
  on public.customers (workspace_id, phone)
  where phone is not null and deleted_at is null;
create index properties_workspace_customer_idx
  on public.properties (workspace_id, customer_id)
  where deleted_at is null;
create unique index services_workspace_name_unique_idx
  on public.services (workspace_id, lower(name));
create unique index crews_workspace_name_unique_idx
  on public.crews (workspace_id, lower(name));
create index crew_members_workspace_user_idx
  on public.crew_members (workspace_id, user_id);
create index leads_workspace_status_received_idx
  on public.leads (workspace_id, status, received_at desc);
create index leads_workspace_customer_idx
  on public.leads (workspace_id, customer_id)
  where customer_id is not null;
create index leads_workspace_project_idx
  on public.leads (workspace_id, project_id)
  where project_id is not null;

create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger crews_set_updated_at before update on public.crews
for each row execute function public.set_updated_at();
create trigger crew_members_set_updated_at before update on public.crew_members
for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads
for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.properties enable row level security;
alter table public.services enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.leads enable row level security;

-- Members may operate day-to-day records. Destructive configuration/crew actions
-- are restricted to workspace owner/admin roles.
create policy "Workspace members can read customers"
on public.customers for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "Workspace members can create customers"
on public.customers for insert to authenticated
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can update customers"
on public.customers for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can read properties"
on public.properties for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "Workspace members can create properties"
on public.properties for insert to authenticated
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can update properties"
on public.properties for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can read leads"
on public.leads for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "Workspace members can create leads"
on public.leads for insert to authenticated
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can update leads"
on public.leads for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can read services"
on public.services for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "Workspace admins can manage services"
on public.services for all to authenticated
using (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = services.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = services.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
);

create policy "Workspace members can read crews"
on public.crews for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "Workspace admins can manage crews"
on public.crews for all to authenticated
using (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = crews.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = crews.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
);

create policy "Workspace members can read crew membership"
on public.crew_members for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "Workspace admins can manage crew membership"
on public.crew_members for all to authenticated
using (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = crew_members.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = crew_members.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner', 'admin'))
  )
);

revoke all on public.customers, public.properties, public.services,
  public.crews, public.crew_members, public.leads from anon;

grant select, insert, update on public.customers, public.properties, public.leads to authenticated;
grant select, insert, update, delete on public.services, public.crews, public.crew_members to authenticated;
