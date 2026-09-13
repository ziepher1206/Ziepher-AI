# Ziepher — Tree Service Launch Plan

This is the first commercial launch configuration of the unified Ziepher platform.

## Goal

Launch a complete, reliable operating loop for small tree-service businesses before expanding to every industry or every planned module.

The first release must be useful enough that an owner can run real daily work through it without juggling separate tools for leads, estimates, scheduling, jobs, invoices, payments, website updates, and basic marketing.

## Customer workflow

```text
Sign up
→ set up company
→ build/connect website
→ capture lead
→ create customer/property
→ schedule estimate
→ create/send estimate
→ customer accepts
→ create/schedule job
→ assign crew
→ complete job
→ invoice
→ collect payment
→ request review
→ follow-up/marketing
→ Ziepher Assistant surfaces next actions
```

## Phase 1 — Foundation

Ship first:

- account/authentication
- organization/workspace
- owner/admin/crew permissions
- company profile
- service area
- services and default pricing/rates
- secure provider connections
- per-business usage/cost ledger
- development/preview/production separation
- audit log for important AI and admin actions

Definition of done:
- tenant isolation tests pass
- a new business can onboard without manually touching Supabase/GitHub/Vercel
- no production secret is exposed to the browser

## Phase 2 — CRM and lead intake

Build/port:

- leads
- customers
- properties
- customer notes
- property/tree notes
- photos
- lead source attribution
- website estimate-request form
- manual/offline lead creation
- basic Ziepher Match source marker

Definition of done:
- lead → customer/property conversion works without duplicate records
- every record is business-scoped
- source attribution is preserved through booking/job/revenue

## Phase 3 — Estimates and scheduling

Build/port:

- estimate appointment
- availability rules
- schedule overrides
- travel/prep/cleanup buffers
- conflict detection
- estimator/crew calendar
- estimate line items
- photos and notes
- customer-facing estimate approval

Definition of done:
- no overlapping restricted assignments
- accepted estimate can create a job without retyping customer/property/service data

## Phase 4 — Jobs and crew

Build/port:

- job statuses
- crew assignments
- job date/time
- equipment/access/hazard notes
- before/after photos
- completion status
- rescheduling
- weather/manual override support later if needed

Definition of done:
- accepted estimate → scheduled job → completed job is one continuous record lineage

## Phase 5 — Invoices and Stripe

Build:

- invoice generation from completed job
- taxes/discounts as explicit line items
- payment status
- receipts
- Stripe test mode
- Stripe customer/payment links or Checkout as appropriate
- refunds/cancellations modeled before production payments

Launch rule:
**Stripe stays in test mode until the final launch checklist is approved.**

Definition of done:
- automated tests for paid/unpaid/refunded/cancelled paths
- no duplicate charge path
- webhook idempotency verified

## Phase 6 — Website and growth

Use the existing website/AI engine for:

- create a new business website or connect an existing supported site
- website scan
- website health
- change requests
- preview/approval/release
- private photo library
- promotions
- lead forms
- lead attribution
- basic SEO/CRO recommendations
- organic social draft creation

Paid advertising and automatic social publishing can follow after the core operations loop is stable.

## Phase 7 — Ziepher Assistant

The owner sees one prioritized daily view:

Examples:
- 3 new leads need contact
- estimate for Smith expires tomorrow
- Jones job needs crew assignment
- 2 invoices are overdue
- website form conversion dropped
- stump grinding promotion ends Friday
- new Ziepher Match opportunity available

The assistant can prepare actions automatically but must respect permissions and approval rules.

## Reuse priorities

### Highest-confidence reuse

From current Ziepher engine:
- auth/workspaces/projects
- AI orchestration
- version/build/preview/release safety
- provider connections
- usage/cost records
- media
- change requests/promotions

From SchedulePilot:
- organization tenancy patterns
- leads
- customers/services
- crews
- appointments/calendar
- availability/override logic
- estimates/jobs data concepts
- scheduling conflict protection

From TreePilot:
- tree-service terminology and workflow UX
- customer/property/tree relationships
- job/crew/invoice screens and domain ideas
- property history/access/hazard concepts

From Ziepher Match:
- homeowner request
- service-area matching
- business opportunity inbox
- inspection scheduling/outcome

## Launch scope guard

Do not delay launch for:

- payroll
- accounting replacement
- general-purpose app store
- every industry template
- voice receptionist
- advanced inventory/fleet
- complex ad automation
- consumer family/life modules
- full migration of every legacy repository

## Target launch criteria

Before accepting production customers:

- complete end-to-end test: lead → paid invoice
- multi-tenant isolation verified
- RLS/security review complete
- Stripe test suite passes
- backups/restore verified
- production rollback tested
- error monitoring active
- privacy/terms/billing terms reviewed
- a human security review completed
- Family Tree Service or another controlled pilot has completed the workflow successfully

After launch, new modules are built behind feature flags and preview deployments while production continues running.
