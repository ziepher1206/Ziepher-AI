# Ziepher

> Legacy repository name: `Ziepher-AI`

This repository is the active engineering foundation for **Ziepher**, the unified AI-powered platform built by Ziepher Tech.

Ziepher is one customer-facing product. Former standalone directions—Ziepher AI, SiteRefiner, Ziepher Builder, SchedulePilot capabilities, and Ziepher Match—are being consolidated into modules inside one platform rather than developed as competing products.

## Product mission

Ziepher helps a business **create, operate, grow, and improve** from one account.

```text
ZIEPHER
├── Create
│   ├── websites
│   ├── web apps
│   ├── hosting/deployment
│   └── domains/database/storage management
├── Operate
│   ├── leads/customers
│   ├── estimates
│   ├── scheduling/crew
│   ├── jobs
│   ├── invoices
│   └── payments
├── Grow
│   ├── website improvement
│   ├── SEO/CRO
│   ├── promotions
│   ├── social marketing
│   └── advertising
├── Match
│   └── customer-to-business marketplace opportunities
└── Ziepher Assistant
    └── orchestrates specialist AI agents across the platform
```

The customer should not need to bounce between GitHub, Vercel, Supabase, AI providers, or secret-key setup for routine use. Ziepher acts as the control plane and presents one account, one assistant, one usage/billing view, and one operational workspace.

## First commercial launch

The first configured industry experience is **tree service**.

Initial complete loop:

```text
business signup
→ website/app build or connection
→ lead
→ customer/property
→ estimate appointment
→ estimate
→ accepted estimate
→ scheduled job + crew
→ completion
→ invoice
→ Stripe payment
→ review/follow-up
→ marketing
→ Ziepher Assistant recommends the next action
```

We are deliberately not waiting for every future Ziepher module before launch.

## Existing infrastructure retained

This repository already contains reusable core infrastructure:

1. Authentication, workspaces, projects, provider connections and permissions.
2. AI planning/build workers and model routing.
3. Website scanning, media, promotions and change-request workflows.
4. Versioned build artifacts and bounded QA/repair.
5. GitHub branch/PR/check/preview/exact-SHA release controls.
6. Vercel deployment orchestration and production verification.
7. Usage/cost telemetry and customer-facing cost records.
8. Supabase-backed control-plane state.

Generated/untrusted code execution remains isolated from the public web process.

## Legacy capability sources

- `ziepher1206/schedulepilot` — scheduling, leads, estimates, jobs, crews, availability and overrides.
- `ziepher1206/treepilot` — preserved tree-service workflow/domain reference including customers, properties, jobs, crews and invoices.
- `ziepher1206/ziepher-match` — current Match marketplace implementation; temporarily remains a separate service/database boundary while it is integrated safely.
- `ziepher1206/ziepher-tech-homepage` — company/public marketing site, not a separate SaaS product.

Do not blindly concatenate old databases or migrations. Capabilities are ported into the unified Ziepher model with tenant-isolation/security tests.

## Infrastructure philosophy

Ziepher should feel like its own hosting/application platform even when provider infrastructure is used underneath.

Current rails may include:

- Supabase
- Vercel
- GitHub
- Stripe
- OpenAI/approved AI providers

These are implementation suppliers. The customer's workflow is Ziepher.

Provider credentials should be OAuth/scoped and encrypted where possible. AI agents receive only the task-specific capability they require. High-impact actions remain approval and budget gated.

## Safety defaults

```text
VERCEL_DEPLOYMENTS_ENABLED=false
VERCEL_PRODUCTION_RELEASES_ENABLED=false
STRIPE_ENABLED=false
SITE_REFINER_PAID_AI_ENABLED=false
SITE_REFINER_PAID_BUILDS_ENABLED=false
```

Legacy environment-variable names may remain during compatibility-safe migration. Do not enable paid usage, real charges, production releases, social posts, ad spend, or outbound campaigns silently.

## Environments

Ziepher is developed without stopping production:

- production — stable customer release
- preview/staging — release verification
- development branches — active work
- feature flags — incomplete modules hidden until ready

Production changes use review, checks, preview, explicit approval, exact-SHA release and rollback/version history.

## Immediate priority

1. Consolidate product language and architecture under Ziepher.
2. Reuse existing auth/build/deploy/AI infrastructure.
3. Build the tree-service operational data model.
4. Port leads/customers/properties.
5. Port estimate/scheduling/crew logic.
6. Port jobs/invoices.
7. Integrate Stripe in test mode.
8. Connect website/growth capabilities to operational records.
9. Integrate Match as an opportunity source.
10. Pilot the end-to-end loop with a controlled tree-service business.
11. Complete security/legal/billing launch review.
12. Launch, collect revenue/feedback, then expand industries/modules.

## Canonical docs

- `docs/ZIEPHER-MASTER-SOURCE.md`
- `docs/ZIEPHER-TREE-SERVICE-LAUNCH.md`
- `docs/ZIEPHER-LEGACY-MIGRATION-MAP.md`

The default rule going forward: **new ideas become Ziepher capabilities, not new standalone products, unless there is a strong architectural/business reason otherwise.**
