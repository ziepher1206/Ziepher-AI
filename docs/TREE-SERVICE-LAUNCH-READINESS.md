# Tree Service Launch Readiness

Current production baseline: `c909ae373e2ed9070615b4cef711825f75c98919`

## Verified now

- Phases 1–7 are merged into `main`.
- The exact Phase 7 production deployment is READY on Vercel.
- Post-deploy runtime error scan returned no error clusters in the checked window.
- Core launch-loop tables have row-level security enabled and at least one RLS policy: workspaces, workspace_members, leads, customers, properties, appointments, estimates, jobs, invoices, invoice_milestones, payment_transactions, operate_review_requests, marketing_campaigns, marketing_source_spend, and workspace_business_profiles.
- Tree Service lead-intake SECURITY DEFINER functions explicitly require authentication; create/revoke token functions also require owner/admin access and validate project/workspace ownership.
- Stripe operating-payment guards remain test-key-only and reject live Stripe event handling.
- CI runs typecheck, lint, Vitest, production build, and a moderate-level dependency audit on pull requests and main.
- The launch-readiness regression test keeps all seven phase guard suites and the core owner workflow in CI scope.

## Still required before accepting production customers

These items require real authenticated/manual verification or external review and must not be marked complete from static code checks alone:

- Complete authenticated E2E run: website/manual lead → customer/property → estimate appointment → estimate → acceptance → job → crew → completion → invoice → Stripe test payment → review/growth follow-up.
- Multi-user tenant-isolation test using at least two distinct workspaces/users, including attempted cross-workspace reads and writes.
- Stripe test-mode duplicate-event/idempotency run with actual test webhook delivery; test paid, partial/stage, refunded, canceled, and repeated-event paths.
- Database backup and restore verification against the production Supabase project or an approved non-production restore target.
- Production rollback drill for the current Vercel application.
- Human security review of RLS, SECURITY DEFINER RPCs, secrets, public endpoints, and payment/webhook boundaries.
- Privacy policy, terms, billing/refund language, and any customer-facing legal terms reviewed by an appropriate professional.
- Controlled pilot completion with Family Tree Service or another approved tree-service business before broad customer launch.

## Current launch decision

The product feature loop is assembled, but broad production-customer launch is **not yet approved**. Continue with verification and controlled pilot hardening rather than adding scope.
