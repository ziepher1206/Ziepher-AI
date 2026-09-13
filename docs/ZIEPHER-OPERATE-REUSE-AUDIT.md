# Ziepher Operate — Legacy Reuse Audit

## Purpose

Ziepher is the only active product identity. This audit identifies proven logic from archived/legacy codebases that can accelerate the first commercial tree-service configuration without reviving their old product names, hosting models, databases, or customer-facing brands.

## Canonical destination

All new operational capability targets the existing Ziepher workspace/auth/control-plane architecture in this repository.

- `workspaces` = business/tenant boundary
- `workspace_members` = business staff membership and role boundary
- `projects` = websites/apps managed by the business
- operational records use `workspace_id`
- existing Ziepher AI/build/source-control/deployment systems remain separate from day-to-day business operations but share the same tenant/account

Do not import the old Replit runtime architecture or SchedulePilot's separate `organizations` identity model.

## Verified reusable sources

### Archived tree-service source snapshot

The archived source contains a working tree-service application implementation including:

- customer leads and public booking intake
- customer/property records
- jobs and crew workflows
- invoices
- company profile and business settings
- tree/property-specific notes
- Stripe Connect onboarding
- Stripe-hosted invoice checkout
- payment milestone support
- refund/webhook handling
- payment tests and idempotency protections

The original live Supabase project no longer exists, so runtime customer data/auth/storage is not recoverable from this source snapshot. SQL/schema source and application logic remain useful references.

### SchedulePilot

SchedulePilot provides a newer multi-tenant operations/scheduling design including:

- customers
- services
- leads
- crews and crew membership
- jobs
- estimates
- appointments
- availability rules
- schedule overrides
- preparation/cleanup buffers
- database-level crew/user overlap protection
- tenant-aware RLS patterns

Its `organization_id` model must be adapted to Ziepher's existing `workspace_id` model rather than copied wholesale.

## Stripe logic worth preserving

The archived tree-service payment service is materially more mature than a basic Stripe checkout example. Preserve these behaviors when implementing Ziepher Payments:

1. **Stripe Connect onboarding** for each business so customer payments settle to the business rather than Ziepher holding business funds directly.
2. **Server-authoritative amounts**. The browser supplies an invoice identifier, never the charge amount.
3. **Tenant/user authorization before checkout**.
4. **Already-paid invoice rejection** before touching Stripe.
5. **Outstanding-balance charging** after manually recorded partial payments.
6. **Milestone/stage billing mutual exclusion** so a business cannot accidentally charge a full invoice on top of paid milestones.
7. **Open Checkout Session reuse** only when the stored amount still matches the current outstanding balance.
8. **Stale Checkout Session expiration** if the amount changed.
9. **Stripe idempotency keys** to protect against double-click/concurrent checkout creation.
10. **Connected-account readiness verification** before allowing customer checkout.
11. **Webhook-driven payment state** and refund handling.
12. **Test coverage around money-critical paths**.

Do not copy old user-scoped authorization literally. Ziepher must scope all payments by `workspace_id` plus invoice/customer relationships and authenticated workspace membership.

## First migration implemented

`20260913142500_ziepher_operate_foundation.sql` introduces the first operational records directly into Ziepher:

- `customers`
- `properties`
- `services`
- `crews`
- `crew_members`
- `leads`
- `operate_lead_status`

The schema uses composite `(id, workspace_id)` integrity where records reference one another so cross-tenant relationships cannot be created accidentally.

### Tree-service-specific data retained without reviving the old brand

`properties` includes:

- physical service address
- access notes
- hazard notes
- structured `tree_notes`
- optional coordinates

This gives the first vertical the property/tree context it needs while remaining extensible for later Ziepher industries.

## Next implementation slices

### Slice 2 — Estimate + scheduling foundation

Adapt the verified SchedulePilot structures to `workspace_id`:

- estimates
- estimate line items
- appointments
- availability rules
- schedule overrides
- crew/user conflict constraints
- service/travel buffers

### Slice 3 — Jobs

- jobs
- job assignments
- job status timeline
- customer/property/service linkage
- estimated and final value
- job notes/media relationship

### Slice 4 — Invoices

Build a normalized Ziepher invoice model rather than retaining legacy JSON invoice snapshots:

- invoices
- invoice line items
- invoice payments
- optional milestones
- balance due
- payment status
- immutable audit events

### Slice 5 — Stripe test-mode integration

Port the verified payment safety behavior into server routes using the normalized Ziepher invoice schema.

Required gate before live money:

- Stripe test mode
- webhook signature verification
- idempotent checkout
- idempotent webhook processing
- cross-tenant authorization tests
- partial-payment tests
- milestone/full-balance mutual-exclusion tests
- refund tests
- explicit production activation approval

### Slice 6 — Ziepher Assistant operations context

Once the operational tables are stable, expose read-only business context to the main Ziepher AI orchestrator so it can answer and prioritize:

- new/uncontacted leads
- estimates waiting for action
- today's appointments/jobs
- scheduling conflicts
- unpaid/overdue invoices
- website/growth recommendations

Action-taking autonomy comes later and remains permission/budget gated.

## Launch definition

The first commercial Ziepher vertical is launch-ready only when the following path works end-to-end under one workspace:

```text
signup
→ business setup
→ lead
→ customer + property
→ estimate appointment
→ estimate
→ accepted estimate
→ scheduled job + crew
→ job completion
→ invoice
→ Stripe payment
→ payment confirmation
→ review/follow-up
→ Ziepher Assistant next actions
```

Site improvement/growth capability and Match opportunities plug into this same account; they are not separate product identities.

## Guardrails

- No old product branding in new customer-facing work.
- Do not resurrect Replit hosting.
- Do not import old deleted Supabase runtime assumptions.
- Do not activate live Stripe while building.
- Do not send real SMS/email/social posts during development.
- Do not bypass workspace RLS/tenant integrity for convenience.
- Preserve archived repositories until all useful logic has been migrated and verified.
