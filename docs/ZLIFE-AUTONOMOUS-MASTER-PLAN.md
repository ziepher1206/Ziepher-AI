# ZLife Autonomous Master Plan

## Mission
Build ZLife into the unified Ziepher Tech platform for personal and business operations, with Tree Service as the first active business module and the ZLife Assistant coordinating specialist AI capabilities across the platform.

## Operating rules
- GitHub is the source of truth.
- No real spending, paid API execution, ad spend, production charges, or paid infrastructure changes without explicit approval.
- Do not enable live Stripe charges, paid AI execution, outbound campaigns, social posting, or production-impacting provider actions silently.
- Use preview/staging for active work. Protect production until release gates pass.
- Every change must be testable, tenant-safe, reversible, and documented.
- Prefer small focused branches and PRs with CI green before merge.
- Preserve working features and existing data boundaries.
- Fix failures instead of bypassing checks.
- Continue to the next safe build task whenever a task completes; do not block on routine decisions that can be resolved from code, tests, product docs, or established ZLife rules.

## Architecture priorities
1. ZLife Core
   - auth, workspaces, organizations, permissions, contributor identity, shared UI, module registry, notifications, billing interfaces, data layer, provider connections, usage/cost telemetry.
2. ZLife Assistant
   - orchestrates specialist AI roles, task routing, bounded tool access, plan/execution state, response contracts, audit trail, human approval gates for costly/high-impact actions.
3. Tree Service
   - business onboarding, company setup, leads, customers, properties, estimates, scheduling, crews, jobs, invoices, test-mode payments, review/follow-up, growth recommendations.
4. Home & Family
   - household dashboard, recurring home tasks, reminders, schedules, records, shared permissions, cross-module context.
5. Build
   - website/app creation, source control, previews, QA/repair, release controls, infrastructure guidance, project cost visibility.
6. Services
   - opportunity/customer-to-business workflows derived from Ziepher Match capabilities with safe separation from core tenant records.
7. Community/Contributor system
   - contribution ledger, scoring safeguards, attribution, governance, public fork/PR workflow, controlled access to production resources.

## Execution phases

### Phase 0 — Repository and release hygiene
- Keep product naming canonical: Ziepher Tech = company, ZLife = platform.
- Resolve open PRs and stale branches.
- Ensure CI, preview deployments, exact-SHA verification, rollback/version history, and feature flags are reliable.
- Align supported Node/runtime versions across local, CI, and Vercel.
- Keep paid/production feature flags disabled by default.

### Phase 1 — Complete the first end-to-end Tree Service loop
- Harden tenant isolation for leads/customers/properties.
- Finish estimates, scheduling, crews, jobs, invoices.
- Keep Stripe test mode only.
- Connect website/growth records to operational entities.
- Add regression tests for every step of the workflow.
- Build controlled seed/demo data and a repeatable end-to-end test scenario.

### Phase 2 — ZLife Assistant end-to-end
- Connect specialist role routing to real platform capabilities.
- Standardize task/response contracts.
- Add bounded execution permissions and audit logs.
- Add deterministic mocks for provider boundaries.
- Prove assistant can inspect state, recommend next action, and execute safe internal actions without paid API use.
- Guard all paid/live provider actions behind explicit approval and budget gates.

### Phase 3 — Home & Family
- Extend the merged working foundation with schedules, reminders, shared family permissions, records, household history, and cross-module context.
- Add accessibility, mobile, navigation, and tenant-isolation tests.

### Phase 4 — Build/Website/App creation
- Complete site scanning, recommendation flows, project planning, generated artifacts, preview QA, repair loops, GitHub PR creation, Vercel preview deployment, and release-readiness checks.
- Keep paid AI/builds disabled until approval.
- Use provider mocks or free/local paths for end-to-end testing where possible.

### Phase 5 — Services/opportunity workflows
- Port useful marketplace capability into ZLife Services.
- Preserve verification, freshness, block/replacement, attribution, and billing boundaries.
- Do not activate real billing until approved.

### Phase 6 — Community/contributor layer
- Finalize contributor onboarding, contribution ledger, scoring safeguards, attribution, fork/PR flow, and governance.
- Keep production credentials and billing authority unavailable to public contributors.

### Phase 7 — Full-system hardening
- Security/RLS review.
- Accessibility review.
- Performance and bundle review.
- Database index/query review.
- Failure/rollback tests.
- Cross-module navigation tests.
- End-to-end preview/staging run across the first production-ready workflow.

## Definition of done for each work item
A work item is not done until:
1. implementation is complete;
2. unit/integration/regression tests cover the behavior;
3. tenant/security boundaries are verified where relevant;
4. CI is green;
5. Vercel preview is healthy when applicable;
6. no paid/live action was enabled without approval;
7. docs and migration notes are updated;
8. the change is merged only when checks pass.

## Autonomous build loop
1. Inspect current main branch, open PRs, failing checks, recent commits, and canonical docs.
2. Select the highest-priority unfinished safe task.
3. Create a focused branch.
4. Implement the smallest complete vertical slice.
5. Add or update tests.
6. Run/inspect CI and preview checks.
7. Fix failures until green.
8. Merge when safe and checks pass.
9. Re-read project state and select the next task.
10. Stop only at a hard boundary requiring explicit approval: real spending, paid API usage, real customer/outbound communications, production billing, destructive production actions, or provider authorization the user must personally complete.

## Current priority order
1. Keep release/CI health green.
2. Complete Tree Service operational loop.
3. Finish ZLife Assistant safe internal execution path.
4. Finish Home & Family core workflows.
5. Finish Build website/app workflows.
6. Integrate Services safely.
7. Complete community/contributor system.
8. Full-system hardening and controlled pilot.
