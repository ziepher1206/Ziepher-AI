# Ziepher — Legacy Project Migration Map

This document prevents duplicate rebuilding while the platform is consolidated.

## Canonical engineering home

The existing `ziepher1206/Ziepher-AI` repository is the active engineering foundation during consolidation. The repository name is legacy; the product is **Ziepher**.

Do not rename infrastructure identifiers merely for appearance if doing so risks production breakage. Customer-facing naming and code/module boundaries should move first. Provider/repository/database renames can happen later under a dedicated migration plan.

## Legacy project classification

| Legacy project | New status | Ziepher destination |
|---|---|---|
| Ziepher AI | absorbed | AI orchestrator, agents, build/control plane |
| SiteRefiner | absorbed | Create/Grow: websites, apps, hosting, refinement, SEO/CRO, promotions |
| Ziepher Builder | absorbed | Create: website/app generation |
| Ziepher Match | module, temporary service boundary | Match |
| SchedulePilot | source module/reference | Operate: leads, calendar, estimates, jobs, crew |
| TreePilot | preserved source/reference archive | Tree-service vertical workflow |
| Plow You Later | no standalone product | potential Match category/freshness logic |
| Scout/JobScout | no standalone product | future Grow/Match intelligence |
| broad Ziepher Business OS plans | product backlog | future Operate modules |
| Family Tree Service | pilot/customer implementation | controlled tree-service proving ground |

## What should NOT be merged blindly

Do not concatenate repositories or database migration folders.

Reasons:

- different tenant models
- duplicate table names
- different authentication assumptions
- different RLS policies
- different deployment histories
- archived Replit-era code
- potential schema semantics conflicts

Instead, migrate capability-by-capability into a single canonical data model.

## Data consolidation sequence

### Stage A — shared identity and organization

Canonical entities:

- `users` via auth provider
- `organizations/workspaces`
- `memberships`
- `roles/permissions`
- `projects/sites/apps`

All operational data must point to a canonical organization/workspace identifier.

### Stage B — tree-service operations

Introduce/normalize:

- leads
- customers
- properties
- property/tree records
- services
- estimate appointments
- estimates + line items
- jobs
- crews + crew members
- job assignments
- availability rules
- schedule overrides
- invoices + invoice line items
- payments/payment events
- media attachments
- source attribution

Port SchedulePilot/TreePilot behavior into this model with tests. Do not import legacy demo/test rows as customer data.

### Stage C — website/app operations

Keep/extend existing Ziepher engine entities for:

- website/app projects
- domains
- scans
- health/recommendations
- change requests
- versions
- build jobs
- source-control runs
- deployments
- media library
- campaigns/promotions

Operational CRM entities should be linkable to website/app projects without becoming dependent on a website existing.

### Stage D — Match integration

First integration should be API/module-level, not a destructive database merge.

Ziepher core receives Match opportunities using stable identifiers and events:

- opportunity created
- business eligible
- interested/pass
- selected
- inspection scheduled
- outcome recorded

Once the unified auth/organization model and marketplace semantics are stable, plan a dedicated Match data migration if it provides a real benefit.

## One-customer experience

Even while backend services remain temporarily separated, the customer should see:

```text
One Ziepher login
One business
One dashboard
One assistant
One permissions model
One usage/billing view
One navigation system
```

Backend separation is an implementation detail.

## Provider abstraction

Create provider adapters behind Ziepher services for:

- deployment/hosting
- database/storage
- payments
- email/SMS
- AI models
- social providers
- ad platforms

Customer-facing workflow must never require users to copy raw secret keys when OAuth/managed provisioning is possible.

## Secret handling

- server-side vault/encrypted credential storage
- OAuth where supported
- just-in-time/scoped credentials
- rotation/revocation support
- no service-role/private keys in client bundles
- AI agents receive only the capability required for the current task
- audit every sensitive action

## Environment structure

Ziepher must maintain independent environments:

- local/development
- preview/staging
- production

New modules are released behind flags. Production customers continue using the current stable version while new capabilities are built and tested.

## Repository cleanup policy

Until capability migration is verified:

- do not delete TreePilot
- do not delete SchedulePilot
- do not delete Ziepher Match
- do not erase Git history
- do not destroy old Supabase projects
- do not remove domains/deployments merely to make the account visually cleaner

After migration, legacy repositories can be marked archived/read-only with a pointer to the canonical Ziepher repository.

## Immediate migration order

1. Make Ziepher the canonical product/source language in the primary repo.
2. Build the tree-service operational schema in the primary Ziepher backend.
3. Port lead/customer/property functions.
4. Port estimate/schedule/crew rules.
5. Port job/invoice flow.
6. Add Stripe test-mode flow.
7. Connect current website/build/growth capabilities to operational data.
8. Add Match as an integrated source of opportunities.
9. Run Family Tree Service controlled pilot.
10. Complete launch/security/billing review.
11. Launch tree-service edition.
12. Expand to the next vertical only after retention and workflow reliability are proven.
