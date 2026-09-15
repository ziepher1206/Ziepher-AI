-- Z-Life Business is one adaptive service-business operating system.
-- Industry choice configures the shared business engine rather than creating
-- a separate top-level module for every trade.

create table if not exists public.zlife_service_industries (
  industry_key text primary key,
  name text not null,
  description text not null default '',
  status text not null default 'preview' check (status in ('available', 'preview', 'hidden', 'retired')),
  default_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.zlife_service_industries enable row level security;

create policy "Authenticated users can read service industry catalog"
on public.zlife_service_industries for select to authenticated
using (status in ('available', 'preview'));

insert into public.zlife_service_industries (industry_key, name, description, status, default_settings)
values
  ('tree_service', 'Tree Service', 'Tree removal, pruning, storm work, estimates, crews, equipment, disposal, stump grinding, and jobsite risk.', 'available', '{"estimate_fields":["tree_count","tree_size","access","hazards","stump_grinding"],"job_fields":["crew","equipment","disposal"]}'::jsonb),
  ('pressure_washing', 'Pressure Washing', 'Exterior cleaning workflows for surfaces, square footage, chemicals, equipment, before/after photos, and recurring service.', 'preview', '{"estimate_fields":["surface_type","square_feet","staining","access"],"job_fields":["equipment","chemicals","before_after_photos"]}'::jsonb),
  ('landscaping', 'Landscaping', 'Landscape projects, recurring maintenance, materials, crews, estimates, schedules, and seasonal work.', 'preview', '{}'::jsonb),
  ('lawn_care', 'Lawn Care', 'Recurring routes, acreage, mowing schedules, seasonal services, crews, and customer reminders.', 'preview', '{}'::jsonb),
  ('cleaning', 'Cleaning', 'Residential and commercial cleaning with property details, recurring schedules, checklists, crews, and supplies.', 'preview', '{}'::jsonb),
  ('hvac', 'HVAC', 'Service calls, maintenance plans, equipment details, estimates, technicians, and follow-up workflows.', 'preview', '{}'::jsonb),
  ('plumbing', 'Plumbing', 'Service calls, estimates, parts, technicians, emergency work, invoices, and follow-up.', 'preview', '{}'::jsonb),
  ('snow_removal', 'Snow Removal', 'Storm response, routes, properties, equipment, trigger depths, recurring agreements, and service records.', 'preview', '{}'::jsonb),
  ('roofing', 'Roofing', 'Inspections, measurements, estimates, materials, crews, project milestones, and customer communication.', 'preview', '{}'::jsonb),
  ('handyman', 'Handyman', 'Flexible service requests, estimates, parts, scheduling, job notes, invoicing, and repeat customers.', 'preview', '{}'::jsonb)
on conflict (industry_key) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  default_settings = excluded.default_settings,
  updated_at = now();

-- workspace_business_profiles already exists in the operating system. Extend it
-- instead of replacing it so current business names, contact info, service area,
-- insurance notes, and other profile data remain untouched.
alter table public.workspace_business_profiles
  add column if not exists industry_key text references public.zlife_service_industries(industry_key) on delete restrict,
  add column if not exists industry_settings jsonb not null default '{}'::jsonb;

-- Every business workspace created before this migration was running the Tree
-- Service vertical, so preserve that context as the first industry profile.
update public.workspace_business_profiles
set industry_key = 'tree_service'
where industry_key is null;

insert into public.zlife_module_catalog (module_key, name, description, route, category, status, is_core)
values (
  'business',
  'Z-Life Business',
  'One adaptive service-business OS for leads, estimates, scheduling, jobs, customers, invoices, payments, expenses, crews, reviews, marketing, reporting, documents, automation, and AI guidance.',
  '/operate',
  'business',
  'available',
  false
)
on conflict (module_key) do update set
  name = excluded.name,
  description = excluded.description,
  route = excluded.route,
  category = excluded.category,
  status = excluded.status,
  is_core = excluded.is_core,
  updated_at = now();

-- Preserve existing Tree Service workspaces while changing the architecture:
-- Tree Service becomes the first configured industry profile inside Business.
insert into public.workspace_module_installations (workspace_id, module_key, installed_by, installed_at, settings)
select
  tree.workspace_id,
  'business',
  tree.installed_by,
  tree.installed_at,
  coalesce(tree.settings, '{}'::jsonb) || '{"industry_profile":"tree_service"}'::jsonb
from public.workspace_module_installations tree
where tree.module_key = 'tree_service'
on conflict (workspace_id, module_key) do update set
  settings = public.workspace_module_installations.settings || excluded.settings;

insert into public.workspace_business_profiles (workspace_id, industry_key, industry_settings)
select
  tree.workspace_id,
  'tree_service',
  coalesce(tree.settings, '{}'::jsonb)
from public.workspace_module_installations tree
where tree.module_key = 'tree_service'
on conflict (workspace_id) do update set
  industry_key = coalesce(public.workspace_business_profiles.industry_key, excluded.industry_key),
  industry_settings = public.workspace_business_profiles.industry_settings || excluded.industry_settings;

delete from public.workspace_module_installations
where module_key = 'tree_service';

update public.zlife_module_catalog
set
  status = 'retired',
  description = 'Legacy top-level module. Tree Service is now an industry profile inside Z-Life Business.',
  updated_at = now()
where module_key = 'tree_service';
