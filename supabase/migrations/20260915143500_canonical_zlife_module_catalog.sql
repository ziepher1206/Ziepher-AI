-- Keep the signed-in module catalog aligned with the public Z-Life ecosystem.
-- "available" means the user can install and use a working signed-in slice.
-- "preview" keeps a module discoverable without pretending unfinished data or
-- actions are ready. Z-Life Core and the central Assistant are not optional
-- installations, so they are intentionally not added to this plug-in catalog.

insert into public.zlife_module_catalog (
  module_key,
  name,
  description,
  route,
  category,
  status,
  is_core
)
values
  (
    'business',
    'Z-Life Business',
    'One adaptive service-business OS for leads, estimates, scheduling, jobs, customers, invoices, payments, growth, documents, automation, and AI guidance.',
    '/operate',
    'business',
    'available',
    false
  ),
  (
    'home_family',
    'Home & Family',
    'Household tasks, recurring maintenance, family organization, reminders, and the everyday information you choose to keep together.',
    '/home',
    'personal',
    'available',
    false
  ),
  (
    'web_builder',
    'AI Web Builder',
    'Create, connect, review, improve, preview, and safely release websites with source control and approval gates.',
    '/projects',
    'build',
    'preview',
    false
  ),
  (
    'app_builder',
    'AI App Builder',
    'Plan, generate, test, preview, and iterate on applications while keeping source control and release boundaries explicit.',
    '/modules/app-builder',
    'build',
    'preview',
    false
  ),
  (
    'money',
    'Money',
    'Organize spending, recurring costs, goals, and financial context with clear approval boundaries for any financial action.',
    '/modules/money',
    'personal',
    'preview',
    false
  ),
  (
    'auto',
    'Auto',
    'Organize vehicles, maintenance, service history, ownership documents, costs, and reminders.',
    '/modules/auto',
    'personal',
    'preview',
    false
  ),
  (
    'documents',
    'Documents',
    'Organize, find, and safely connect important files to the Z-Life modules that need them.',
    '/modules/documents',
    'personal',
    'preview',
    false
  ),
  (
    'health',
    'Health',
    'Permission-aware wellness organization for routines, records, goals, appointments, and personal health context.',
    '/modules/health',
    'personal',
    'preview',
    false
  ),
  (
    'travel',
    'Travel',
    'Plan trips, itineraries, reservations, documents, tasks, costs, and shared travel details in one connected place.',
    '/modules/travel',
    'personal',
    'preview',
    false
  ),
  (
    'learning',
    'Learning',
    'Organize learning goals, study plans, resources, projects, and progress with AI guidance.',
    '/modules/learning',
    'personal',
    'preview',
    false
  ),
  (
    'services',
    'Services',
    'Create and track real-world service needs while keeping request history connected to your Z-Life workspace.',
    '/services',
    'services',
    'preview',
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
