# Ziepher — Master Product Source

## Product identity

**Ziepher** is the single customer-facing platform.

Ziepher Tech remains the company that builds and operates Ziepher. Former product names are no longer separate customer-facing products unless explicitly revived.

- **Ziepher AI** → absorbed into the core intelligence/orchestration layer.
- **SiteRefiner** → absorbed into the website/app creation, improvement, hosting, SEO, CRO, promotion, and publishing capabilities.
- **Ziepher Match** → absorbed as the marketplace/demand module inside Ziepher.
- **SchedulePilot** → absorbed as scheduling, lead, estimate, job, calendar, crew, and availability capability.
- **TreePilot** → preserved as a source/reference archive for tree-service workflows, customer/property/job/crew/invoice concepts, and domain-specific UX.
- **Ziepher Builder** → absorbed into Create/Build capabilities.
- **Scout/JobScout, Plow You Later, broader Business OS ideas** → backlog or future modules unless incorporated into a concrete Ziepher capability.

Legacy repository names, database object names, environment variables, and provider project names may remain temporarily for compatibility. Customer-facing naming should converge on **Ziepher**.

## North star

A business owner should be able to use one product to:

1. Start or connect a business.
2. Build or connect a website/app.
3. Host and operate it through Ziepher.
4. Capture and manage leads/customers.
5. Create estimates, jobs, schedules, invoices, and payments.
6. Market the business across the website, social channels, promotions, and paid advertising.
7. Receive marketplace opportunities through Ziepher Match where relevant.
8. Ask one AI assistant what to do next.
9. Let specialized AI agents perform approved work under clear permissions, budgets, and safety limits.
10. See one bill, one usage view, one account, and one support experience.

The customer should not need to understand GitHub, Vercel, Supabase, secret keys, deployment pipelines, model providers, or infrastructure accounts for routine use.

## Core product model

```text
                         ZIEPHER
                            │
                   Zypher AI Orchestrator
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
      CREATE              OPERATE               GROW
 websites/apps      CRM/estimates/jobs      marketing/SEO
 hosting/deploy      schedule/crew          social/promos
 database/storage    invoices/payments      advertising
        │                   │                    │
        └───────────────────┼────────────────────┘
                            │
                           MATCH
                 homeowner/customer demand
                            │
                         ANALYTICS
                usage/cost/revenue/results
```

These are modules inside one platform, not separate products customers must stitch together.

## AI organization

The customer interacts with one **Ziepher Assistant**. Behind it, specialist agents can be activated as needed:

- Orchestrator / Chief of Staff
- Business Strategist
- Product Architect
- Full-Stack Builder
- UI/UX Designer
- Website/SEO/CRO Specialist
- Marketing & Advertising Specialist
- CRM / Operations Specialist
- Scheduling / Workforce Specialist
- Finance / Billing Specialist
- Infrastructure / DevOps Specialist
- Data / Analytics Specialist
- Security / Permissions Specialist
- QA / Release Specialist
- Customer Success Specialist

Agents do not receive unrestricted permanent access. They operate with task-scoped permissions, spend limits, approvals, audit logs, and verification.

## Infrastructure direction

Ziepher should **feel like its own hosting and application platform** even while using infrastructure suppliers under the hood.

Initial supplier stack can continue to include:

- Vercel for application deployment/hosting
- Supabase for Postgres/Auth/Storage/Realtime where appropriate
- GitHub for source control and immutable change history
- Stripe for payments/billing
- OpenAI and other approved model providers for AI

These are provider rails, not customer workflow. Customers interact with Ziepher.

Long-term architecture:

```text
Customer → Ziepher UI/API → Ziepher Control Plane
                              │
                              ├─ identity & permissions
                              ├─ project/workspace model
                              ├─ secret vault / OAuth connections
                              ├─ AI orchestration
                              ├─ build/preview/release engine
                              ├─ hosting/database/storage allocator
                              ├─ usage/cost engine
                              └─ audit/approval system
                                   │
                     provider infrastructure rails
```

Use just-in-time scoped credentials and OAuth/API connections where possible. Secrets should never be exposed to the customer browser or unnecessarily to AI agents.

## Resource and billing model

Each business/workspace and project must have its own usage ledger for:

- database/storage
- bandwidth
- hosting/compute
- AI input/output/cached tokens
- images/media
- email/SMS/voice where enabled
- payment fees
- third-party APIs
- marketplace costs
- other infrastructure

Ziepher converts this into simple customer allowances and pricing. No surprise charges. Overages/upgrades require explicit approval unless the customer later enables a clearly capped auto-approval policy.

## First launch niche: tree service

The first commercial version should be **Ziepher for Tree Service Businesses**.

This is not a separate product name. It is the first configured industry experience inside Ziepher.

### Launch loop

```text
Business signs up
→ company setup
→ website/app created or connected
→ lead enters
→ customer/property record
→ estimate scheduled
→ estimate created/sent
→ accepted estimate becomes job
→ crew/job scheduled
→ job completed
→ invoice generated
→ Stripe payment
→ review request
→ marketing/website follow-up
→ Ziepher Assistant recommends next actions
```

### Launch modules

1. Account, organization, roles, permissions
2. Tree-service company profile and service area
3. Leads/customers/properties
4. Estimate requests and estimate scheduling
5. Estimates with services/photos/pricing
6. Jobs and job status
7. Calendar, availability, crew assignments, buffers/overrides
8. Invoices
9. Stripe test-mode payment flow, then production only after explicit launch approval
10. Basic website builder/hosting or connected-site management
11. Website lead forms and attribution
12. Simple promotion/social content workflow
13. Ziepher Match opportunities as an optional source
14. One AI daily-action assistant
15. Usage/cost tracking and admin controls

### Explicitly not required for first launch

- payroll
- full accounting replacement
- advanced inventory
- AI voice receptionist
- broad consumer life-management features
- every business industry
- every CMS/platform integration
- autonomous ad spend
- fully automatic production changes without approval

## Reuse map

### Current Ziepher-AI repository
Use as the primary active engineering foundation for:

- authentication/workspaces/projects
- AI planning/build workers
- source-control orchestration
- preview/approval/release workflow
- Vercel deployment orchestration
- usage/cost telemetry
- website scanning
- media library
- promotion/change requests

### SchedulePilot
Reuse ideas/code selectively for:

- multi-tenant organization structure
- leads/customers/services/crew
- estimates/jobs/appointments
- availability rules
- schedule overrides
- conflict/buffer protection
- authenticated operations UI

Do not merge database migrations blindly. Port tested concepts into the unified Ziepher schema.

### TreePilot
Preserve as reference/source archive. Reuse only verified pieces that improve the tree-service launch:

- customer/property relationships
- tree/property notes
- leads
- saved jobs
- crew assignments
- invoices
- booking/settings concepts
- job workflow and tree-service domain terminology

Do not resume TreePilot as a separate product and do not copy Replit-era infrastructure wholesale.

### Ziepher Match
Keep its production/database boundary temporarily while integration is designed. Expose it to Ziepher through a module/API boundary first. Later migrate data/services into the unified platform only after a tested migration plan exists.

## Development environments

Production must remain usable while Ziepher continues to grow.

- **Production**: stable customer release
- **Preview/Staging**: each proposed release tested before promotion
- **Development branches**: new modules/features
- Feature flags for unfinished modules
- Database migrations must be backward-compatible where possible
- Release by exact reviewed SHA
- Rollback/version history retained

Building new modules must not stop the live application.

## Safety rules

- No real payments/charges without explicit approval during development.
- Stripe remains test mode until launch approval.
- No real social post, paid ad, SMS/email blast, domain purchase, provider upgrade, or production infrastructure purchase without authorization.
- No destructive database/repository migrations solely to make names look cleaner.
- Keep audit logs for AI actions and infrastructure changes.
- High-impact actions require customer approval unless a clearly scoped automation policy has been enabled.

## Product-development rule

Before creating any new repository, domain, app, or product name, answer:

> Is this a capability inside Ziepher?

Default answer should be yes.

## Current priority

**Do not attempt to build the full lifetime vision before launch.**

Current priority is to assemble the strongest already-built pieces into the first complete tree-service operating loop, test it end-to-end, launch it, collect revenue and feedback, then expand Ziepher module by module.
