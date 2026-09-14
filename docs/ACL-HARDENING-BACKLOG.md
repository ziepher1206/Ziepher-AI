# ACL hardening backlog

## `convert_operate_lead_to_estimate`

Live audit on 2026-09-14 confirmed the function is `SECURITY INVOKER`, authenticates with `auth.uid()`, and checks workspace membership, so anonymous invocation fails closed. Its live PostgreSQL ACL nevertheless still includes `PUBLIC` execute.

Controlled follow-up:

- create a dedicated reviewed Supabase migration using the normal migration workflow;
- revoke execute from `PUBLIC` and `anon`;
- explicitly retain `authenticated` and `service_role` execution;
- verify the live ACL and Tree Service scheduling/conversion tests after applying;
- do not combine this ACL cleanup with product-role changes.

This backlog item intentionally does not mutate production.
