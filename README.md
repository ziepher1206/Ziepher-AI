# ZLife

> Legacy repository name: `Ziepher-AI`

This repository is the active engineering foundation for **ZLife**, the main platform built and operated by **Ziepher Tech**.

Ziepher Tech is the company. ZLife is the unified customer-facing platform. Capabilities that were previously explored as separate products—Ziepher AI, SiteRefiner, Ziepher Builder, SchedulePilot capabilities, and Ziepher Match—are being consolidated into ZLife modules or connected services instead of competing standalone products.

## Product mission

ZLife helps people and businesses **create, operate, grow, organize, and improve** from one connected platform.

```text
ZLIFE
├── Business
│   ├── websites and web apps
│   ├── leads/customers
│   ├── estimates
│   ├── scheduling/crew
│   ├── jobs
│   ├── invoices/payments
│   └── growth/marketing
├── Build
│   ├── AI-assisted website/app creation
│   ├── source control
│   ├── preview/release
│   └── infrastructure management
├── Services
│   └── customer-to-business opportunity workflows
├── Future life modules
│   └── additional personal and business capabilities
└── ZLife Assistant
    └── coordinates the existing specialist AI team across the platform
```

Customers should not need to bounce between GitHub, Vercel, Supabase, AI providers, or secret-key setup for routine work. ZLife acts as the control plane and presents one account, one assistant, one usage/cost view, and connected modules.

## First active business module

The first active business module is **Tree Service**.

Initial complete loop:

```text
business signup
→ company setup
→ website/app build or connection
→ lead
→ customer/property
→ estimate appointment
→ estimate
→ accepted estimate
→ scheduled job + crew
→ completion
→ invoice
→ Stripe test-mode payment workflow
→ review/follow-up
→ marketing
→ ZLife Assistant recommends the next action
```

We are deliberately not waiting for every future ZLife module before completing the Tree Service launch path.

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

Generated or untrusted code execution remains isolated from the public web process.

## Legacy capability sources

- `ziepher1206/schedulepilot` — scheduling, leads, estimates, jobs, crews, availability and overrides.
- `ziepher1206/treepilot` — preserved tree-service workflow/domain reference including customers, properties, jobs, crews and invoices.
- `ziepher1206/ziepher-match` — marketplace implementation and capability source while service/opportunity workflows are integrated safely.
- `ziepher1206/ziepher-tech-homepage` — Ziepher Tech company/public marketing site, not the ZLife application itself.

Do not blindly concatenate old databases or migrations. Capabilities are ported into the unified ZLife model with tenant-isolation and security tests.

## Infrastructure philosophy

ZLife should feel like its own platform even when provider infrastructure is used underneath.

Current rails may include:

- Supabase
- Vercel
- GitHub
- Stripe
- OpenAI and approved AI providers

These are implementation suppliers. The customer's workflow is ZLife.

Provider credentials should be OAuth/scoped and encrypted where possible. AI agents receive only the task-specific capability they require. High-impact actions remain approval and budget gated.

## Safety defaults

```text
VERCEL_DEPLOYMENTS_ENABLED=false
VERCEL_PRODUCTION_RELEASES_ENABLED=false
STRIPE_ENABLED=false
SITE_REFINER_PAID_AI_ENABLED=false
SITE_REFINER_PAID_BUILDS_ENABLED=false
```

Legacy environment-variable names may remain during compatibility-safe migration. Do not enable paid usage, real charges, production releases, social posts, ad spend, contributor payments, or outbound campaigns silently.

## Environments

ZLife is developed without stopping production:

- production — stable customer release
- preview/staging — release verification
- development branches — active work
- feature flags — incomplete modules hidden until ready

Production changes use review, checks, preview, exact-SHA release controls, and rollback/version history.

## Immediate priority

1. Keep product language and architecture canonical under ZLife.
2. Reuse existing auth/build/deploy/AI infrastructure.
3. Complete the Tree Service operational data model.
4. Strengthen leads/customers/properties tenant isolation.
5. Complete estimate/scheduling/crew workflows.
6. Complete jobs/invoices.
7. Keep Stripe in test mode until launch approval.
8. Connect website/growth capabilities to operational records.
9. Integrate service/opportunity workflows safely.
10. Complete security, accessibility, CI, database, and performance gates.
11. Pilot the end-to-end Tree Service loop in a controlled environment.
12. Expand into additional ZLife modules only after the first module is stable.

## Canonical docs

- `docs/ZIEPHER-MASTER-SOURCE.md`
- `docs/ZIEPHER-TREE-SERVICE-LAUNCH.md`
- `docs/ZIEPHER-LEGACY-MIGRATION-MAP.md`

Some file names retain legacy Ziepher naming for compatibility and history. Their product language should follow the current rule:

**Ziepher Tech is the company. ZLife is the main platform. Tree Service is the first active business module.**

New ideas should become ZLife capabilities or modules rather than new standalone products unless a strong architectural or business reason requires a separate boundary.
