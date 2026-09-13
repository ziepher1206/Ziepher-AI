# SiteRefiner Engine

> Legacy repository name: `Ziepher-AI`

This repository is now the active engineering foundation for **SiteRefiner — built by Ziepher Tech**.

The former standalone Ziepher AI product direction has been consolidated into SiteRefiner. Existing internal identifiers such as repository names, environment-variable prefixes, migration names, and historical database objects may retain `Ziepher` naming where changing them would create compatibility risk.

## Product purpose

SiteRefiner gives businesses an AI web team for websites they already own. It can audit an existing site, understand the business, recommend improvements, create safe proposed changes, generate previews, run QA, obtain customer approval, publish through supported integrations, track versions/rollback, manage promotions and approved marketing workflows, and meter AI/provider costs per business and website.

The initial core loop is:

```text
business workspace
→ connect/enter website
→ scan + business context
→ prioritized recommendation or owner request
→ AI plan/change
→ isolated version/branch
→ automated checks
→ preview
→ customer approval
→ exact reviewed release
→ production verification
→ usage/cost recording
→ continuous recommendations
```

## Active portfolio boundary

- **SiteRefiner** — flagship website improvement/management/marketing platform. This repo supplies its AI/build/orchestration engine.
- **Ziepher Match** — separate local-service marketplace with its own repository and business rules.
- **Ziepher AI** — no longer a separate public product; its useful technology is absorbed here.
- **Ziepher Builder** — retired standalone name; useful capability is absorbed here.

## Existing architecture being reused

The consolidation intentionally preserves mature infrastructure already built in this repo:

1. **Web control plane** — authentication, workspaces, projects, context, review UI, provider connections, repository/deployment settings, and release actions.
2. **AI/build worker** — durable build jobs, model routing, bounded repair, isolated validation, and immutable artifacts.
3. **Source-control worker** — GitHub branches, changes, pull requests, checks, preview readiness, approval, and exact-SHA merge controls.
4. **Deployment worker** — Vercel project binding, deployment reconciliation, release gates, and production verification.
5. **Usage/cost ledger** — model token/cost telemetry now extended for SiteRefiner workspace/project customer usage.

Generated package scripts never execute inside the public Next.js web process.

## SiteRefiner-specific data foundation

The existing `workspaces` table represents a business account. Existing `projects` become website/project records.

New SiteRefiner foundation includes:

- business/site domain and scan fields on projects;
- customer-facing usage values on model usage;
- `media_assets` for the business photo/media library;
- `marketing_campaigns` for promotions, social/marketing campaign state, approvals, schedules, and channels;
- `project_cost_events` for non-AI/provider cost attribution and customer-visible usage totals.

Provider connections remain workspace-scoped and can later support authorized social/marketing providers in addition to GitHub/Vercel.

## AI model routing

OpenAI remains the primary configured AI provider. Keep model IDs explicit so behavior and costs do not change silently.

```text
ZIEPHER_AI_PRIMARY_PROVIDER=openai
ZIEPHER_AI_ALLOW_PAID_FALLBACK=false
OPENAI_API_KEY=
OPENAI_PLANNING_MODEL=gpt-5.6-luna
OPENAI_BUILD_MODEL=gpt-5.6-terra
OPENAI_ESCALATION_MODEL=gpt-5.6-sol
```

These environment-variable names are legacy internal identifiers and should not be renamed casually.

## GitHub and Vercel safety

GitHub remains the durable source of truth for native SiteRefiner-managed code changes.

- AI changes use isolated branches/pull requests where source control is available.
- Preview approval is owner/admin controlled.
- Merges are bound to the reviewed head SHA.
- Production release remains a separate action/gate.
- Provider credentials are workspace-scoped and encrypted.
- Customer projects never implicitly use a global operator Vercel token.
- Provider deployment attempts are durably recorded and reconciled rather than blindly retried.

Relevant existing release gates remain:

```text
VERCEL_DEPLOYMENTS_ENABLED=false
VERCEL_PRODUCTION_RELEASES_ENABLED=false
STRIPE_ENABLED=false
```

Do not enable paid billing, real ad spend, or production automation silently.

## Supabase

Supabase provides authentication, business workspaces, website projects, project/version state, AI usage/cost telemetry, provider connections, media/campaign records, private artifacts, source-control orchestration, and deployment state.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ZIEPHER_PROVIDER_CREDENTIALS_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ZIEPHER_PROVIDER_CREDENTIALS_KEY` to the browser.

## Workers

```bash
npm run worker
npm run source-control-worker
npm run deploy-worker
```

Workers remain separately scalable services and should keep generated/untrusted execution isolated from the public web process.

## Validation

```bash
npm run check
npm run smoke:generated
npm audit --audit-level=moderate
```

`npm run check` runs the existing TypeScript, lint, test, PWA, and production-build quality gates.

## Security note

The current Supabase project has pre-existing security-advisor warnings around intentionally server-mediated RLS tables and authenticated-callable `SECURITY DEFINER` RPCs. Do not blanket-change those functions without reviewing their authorization logic and call sites. New SiteRefiner tables use RLS and scoped authenticated policies; internal cost-event writes remain server-side.

## Implementation priority

1. Keep Ziepher Match separate and stabilize it without expanding scope.
2. Convert the user-facing product experience in this repo from generic app building to SiteRefiner website onboarding/management.
3. Reuse existing workspaces/projects, model usage, source-control, Vercel, approvals, versioning, and deployment safety.
4. Build the core website loop: account → domain → scan → recommendation/request → change → QA → preview → approval → publish → rollback/history → usage tracking.
5. Add media library, promotions, organic social workflows, and paid-ad recommendations on the same foundation.
6. Preserve legacy technical identifiers until a dedicated compatibility-safe migration justifies renaming them.

## Documentation

The company-level canonical product scope is maintained in `docs/SITEREFINER-PRODUCT-SCOPE.md` in the Ziepher Tech company repository. Operational/security documents in this repo remain valid where they describe the underlying build, source-control, deployment, and trust architecture.
