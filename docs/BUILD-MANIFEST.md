# Ziepher AI Build Manifest

**Current rebuild checkpoint:** September 11, 2026  
**Product:** Ziepher AI — Build Your Dreams

## Active delivered systems

- Browser-first visual/voice planning studio and installable PWA surface
- Deterministic, OpenAI, and optional Gemini planning/build routes
- OpenAI-first paid-provider policy with paid fallback disabled by default
- Supabase authentication, workspaces, projects, specifications, context, private artifacts, build/deployment ledgers, and project sync state
- Docker-oriented isolated build runner contracts and generated-source security checks
- Durable build publication with idempotent project-version/artifact creation
- Encrypted provider-connection storage
- GitHub OAuth with token refresh and sanitized connection status
- Workspace-scoped Vercel credential validation, encrypted persistence, sanitized status, and revocation
- Verified project-to-GitHub repository binding
- Durable source-control run ledger and worker leases
- Isolated generated-code branch creation
- Atomic generated-source publication to GitHub
- Retry-safe PR creation and PR identity verification
- GitHub check gating
- Explicit project-to-Vercel project binding validated through that project's workspace Vercel connection
- Immutable per-deployment Vercel target snapshots
- Deployment workers resolve only the encrypted Vercel credential owned by the deployment project's workspace; there is no global operator-token fallback for customer projects
- Vercel preview gating before human approval
- Owner/admin approval recorded against the reviewed source-control run
- Exact-head, retry-safe squash merge
- Production release separated from merge and disabled by default
- Production release tied to the exact merged source-control run and build version
- Vercel provider-attempt marker written before deployment side effects
- Vercel metadata reconciliation to prevent blind duplicate deployment retries
- Build Review visibility for preview/production deployment and reconciliation state
- Stripe code retained but disabled until separate financial release gates pass
- CI, web/worker Dockerfiles, cloud topology documentation, health/readiness endpoints, and release/security runbooks

## Current validation pattern

Every PR in the rebuild is required to pass:

| Check | Gate |
|---|---|
| TypeScript | `npm run typecheck` |
| ESLint | `npm run lint` |
| Unit tests | `npm test` |
| Production compilation | `npm run build` |
| Dependency audit | `npm audit --audit-level=moderate` |

Schema milestones are additionally reviewed, applied to the Ziepher AI Supabase project, checked with Supabase security/performance advisors, and exercised with rollback-only synthetic transactions where practical.

Recent rollback tests have covered:

- source-control worker leases and exact state transitions;
- owner/admin approval authority;
- exact-head merge completion;
- production-release authorization and stale-release rejection;
- idempotent production queueing and failed-release retry;
- Vercel project target snapshotting and immutability;
- Vercel provider-attempt durability and reconciliation state preservation.

Synthetic tests are rolled back and verified for zero residue.

## External/operator validation still required

These items cannot be proven by repository code alone:

- Protect GitHub `main` with branch protection/rulesets so direct pushes cannot bypass PR/CI policy.
- Create and connect a dedicated Vercel project for the standalone `Ziepher-AI` control plane; do not reuse or overwrite an unrelated production project.
- Operate the web control plane and private workers on intended production infrastructure.
- Configure production-grade worker monitoring/restart policy and secret delivery.
- Connect and validate intended workspace Vercel accounts/project targets for real projects.
- Run controlled real preview deployments only after Vercel deployment execution is deliberately enabled.
- Enable production releases only after preview, recovery, approval, and operational checks are complete.
- Configure Stripe test products/webhooks and complete end-to-end financial tests before any live billing activation.
- Configure spending limits, retention rules, backups, alerts, and incident response for production services.

## Delivery scope

The active client is the HTTPS web application/PWA.

The former Tauri desktop and Capacitor Android/iOS wrappers were removed from the active working tree and release pipeline during the browser-first rebuild. Their history remains available in Git if a future native client becomes justified.

Browser project synchronization remains active. Legacy bridge schema/API compatibility is retained without keeping native packaging as an active product surface.

## Safety defaults

- Generated code is treated as untrusted.
- Unsandboxed build execution is disabled by default.
- Paid AI fallback is disabled by default.
- Provider credentials remain server-side and encrypted where persisted.
- Workspace Vercel credentials are isolated from other workspaces and are never replaced by a global operator token for customer deployment work.
- AI-generated code cannot merge without owner/admin approval of the reviewed build.
- Merge does not trigger production automatically.
- Vercel deployments require an explicit validated project target.
- Ambiguous Vercel provider outcomes do not cause blind duplicate deploys.
- `VERCEL_DEPLOYMENTS_ENABLED=false` by default.
- `VERCEL_PRODUCTION_RELEASES_ENABLED=false` by default.
- `STRIPE_ENABLED=false` by default.
