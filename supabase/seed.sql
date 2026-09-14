-- ZLife local/community development seed data.
-- Keep this file free of real customer, production, contributor, revenue, payout,
-- donation, credential, or personally identifying data.

insert into public.community_modules (id, name, description, status)
values
  ('core', 'ZLife Core', 'Shared authentication, organizations, permissions, UI, data and platform services.', 'active'),
  ('tree-service', 'Tree Service', 'First active business vertical.', 'active'),
  ('ai-assistant', 'AI Assistant', 'ZLife assistant and specialist-agent interfaces.', 'active'),
  ('web-builder', 'Web Builder', 'Website creation and improvement module.', 'active'),
  ('app-builder', 'App Builder', 'Application creation module.', 'active')
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  updated_at = now();

-- Intentionally no contributor rows or contribution scores are seeded. Contributor
-- identity and contribution history must come from real, verified project activity.
