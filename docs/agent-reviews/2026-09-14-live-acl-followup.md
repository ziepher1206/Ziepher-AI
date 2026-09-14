# Live ACL follow-up — 2026-09-14

During the Tree Service end-to-end contract audit, the live Ziepher AI Supabase project was compared against the repository's effective function definitions.

## Finding

`public.convert_operate_lead_to_estimate(uuid,text,timestamptz,integer)` is a `SECURITY INVOKER` function and correctly performs an `auth.uid()` authentication check plus workspace-membership authorization before changing data. The live function therefore fails closed for anonymous callers.

However, the live ACL still includes PostgreSQL `PUBLIC` execute in addition to explicit `authenticated` and `service_role` execution. The historical migration `20260913155000_ziepher_operate_lead_to_estimate.sql` revoked `anon` but did not revoke `PUBLIC`; later migrations redefined the function and preserved that ACL shape.

## Risk assessment

This is defense-in-depth hardening debt, not a demonstrated authorization bypass. Anonymous callers receive a null `auth.uid()` and the function raises `Authentication required.` before reading or writing the target lead.

## Recommended controlled fix

In a dedicated reviewed Supabase migration:

1. Revoke execute on `public.convert_operate_lead_to_estimate(uuid,text,timestamptz,integer)` from `PUBLIC` and `anon`.
2. Explicitly grant execute to `authenticated` and `service_role`.
3. Verify the function body and effective ACL after applying the migration.
4. Run the Tree Service lead-conversion and scheduling regression suites.
5. Do not alter the function's product authorization model in the same migration.

Production database mutation is intentionally not performed by this audit branch.
