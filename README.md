# Ziepher AI

**Build Your Dreams**

Ziepher AI is a browser-first AI application builder and control plane. The current architecture turns an idea into a planned, generated, validated, reviewable application while keeping GitHub as the source of truth and Vercel as the deployment rail.

The active workflow is:

```text
idea/project
→ AI plan
→ validated build
→ durable source artifact
→ isolated GitHub branch
→ pull request
→ GitHub checks
→ Vercel preview
→ owner/admin approval
→ exact-SHA merge
→ explicit production release
→ production verification
```

Ziepher does not merge a generated build before approval, and merge does not automatically deploy production.

## Active architecture

Ziepher runs four independent concerns:

1. **Web control plane** — authentication, projects, planning, project context, review UI, provider connections, repository/deployment settings, and release actions.
2. **Build worker** — claims build jobs, generates source, runs isolated quality gates, repairs bounded failures, and publishes immutable build artifacts.
3. **Source-control worker** — creates isolated GitHub branches, publishes generated changes, opens PRs, waits for checks and a real preview, and merges only an explicitly approved exact head SHA.
4. **Deployment worker** — deploys to an explicitly bound Vercel project using that workspace's encrypted Vercel credential and reconciles provider state without blindly duplicating a deployment after an ambiguous response.

Generated package scripts never execute inside the public Next.js web process.

## Core safety model

- GitHub is the durable source of truth for generated code.
- AI changes use isolated branches and pull requests.
- GitHub PR identity and checks are verified before approval.
- Preview approval is owner/admin only and records the approving user.
- Merges are bound to the exact reviewed head SHA.
- Production release is a separate owner/admin action.
- Production releases are disabled by default with `VERCEL_PRODUCTION_RELEASES_ENABLED=false`.
- Every Vercel deployment snapshots its canonical Vercel project/account identity when queued.
- Every provider deployment attempt is durably recorded before the Vercel side effect.
- If Vercel's response is ambiguous, Ziepher reconciles provider metadata and never automatically issues a second deployment for the same deployment row.
- GitHub and Vercel credentials are workspace-scoped, encrypted at rest, and never returned to the browser after connection.
- Customer projects never implicitly use a global Ziepher operator Vercel token.
- Stripe remains disabled until separate financial release gates are deliberately enabled.

## Providers

### OpenAI

OpenAI is retained as Ziepher's primary configured paid AI provider. Model IDs are explicit so cost and behavior do not change silently.

```text
ZIEPHER_AI_PRIMARY_PROVIDER=openai
ZIEPHER_AI_ALLOW_PAID_FALLBACK=false
OPENAI_API_KEY=
OPENAI_PLANNING_MODEL=gpt-5.6-luna
OPENAI_BUILD_MODEL=gpt-5.6-terra
OPENAI_ESCALATION_MODEL=gpt-5.6-sol
```

Gemini remains optional. Deterministic generation remains the zero-cost fallback.

### GitHub

GitHub OAuth credentials are encrypted before persistence. Projects bind to a verified writable repository and snapshot repository identity into source-control runs.

```text
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
ZIEPHER_PROVIDER_CREDENTIALS_KEY=
```

### Vercel

Vercel is connected per workspace from **Settings → Connected rails**. A workspace owner supplies a Vercel access token and, when appropriate, a `team_...` ID. Ziepher validates the credential with Vercel and encrypts it before persistence.

Each Ziepher project must then be explicitly bound to a Vercel project that the connected workspace credential can access.

```text
VERCEL_DEPLOYMENTS_ENABLED=false
VERCEL_PRODUCTION_RELEASES_ENABLED=false
DEPLOYMENT_WORKER_ID=deployment-worker-1
DEPLOYMENT_WORKER_POLL_MS=5000
```

The deployment worker resolves the encrypted workspace credential at runtime and targets only the immutable Vercel project/account snapshot stored on the deployment row. It does not infer a project from a temporary working directory and does not use a global `VERCEL_TOKEN` for customer deployments.

## Web/PWA delivery

The active end-user client is the HTTPS web application. It includes an installable PWA manifest, icons, service worker, offline status page, and install prompt.

The old Tauri desktop and Capacitor mobile packaging projects are no longer part of the active product or release pipeline. Their history remains available in Git rather than being maintained as parallel clients.

## Supabase

Supabase provides authentication, projects/workspaces, project sync state, build/deployment ledgers, provider-connection records, private artifacts, source-control orchestration, and operational state.

Apply migrations in `supabase/migrations` in order and configure:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ZIEPHER_PROVIDER_CREDENTIALS_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ZIEPHER_PROVIDER_CREDENTIALS_KEY` to a browser or generated application.

## Build worker

The default runner uses Docker and gives generated code no platform secrets:

```bash
npm run worker
```

Relevant settings:

```text
BUILD_WORKER_ID=build-worker-1
BUILD_WORKER_POLL_MS=3000
BUILD_RUNNER_EXECUTION=docker
BUILD_RUNNER_IMAGE=node:22-bookworm
BUILD_RUNNER_MAX_SECONDS=600
BUILD_MAX_REPAIRS=1
ALLOW_UNSANDBOXED_RUNNER=false
BUILD_WORK_ROOT=.ziepher-builds
```

Use a dedicated worker host. Do not mount the Docker socket into the public web container.

## Source-control worker

```bash
npm run source-control-worker
```

The source-control worker consumes the durable `source_control_runs` ledger. It creates GitHub branches/changes/PRs, waits for checks and preview readiness, then waits for human approval before exact-SHA merge.

## Deployment worker

```bash
npm run deploy-worker
```

Vercel deployment is disabled until the operator deliberately sets `VERCEL_DEPLOYMENTS_ENABLED=true`. Production also requires the separate production-release gate. Each workspace must connect Vercel before its projects can bind or deploy Vercel targets.

## Stripe

Stripe remains off by default:

```text
STRIPE_ENABLED=false
```

Do not enable live billing until the core product, authorization/RLS, worker recovery, deployment checks, and financial release checklist have passed.

## Local setup

Requirements:

- Node.js 22.16 or later
- npm 10 or later
- Supabase for saved/shared cloud projects
- Docker on build-worker hosts
- provider credentials only for the rails you intentionally enable

```bash
cp .env.example .env.local
npm ci
npm run dev
```

## Validation

```bash
npm run check
npm run smoke:generated
npm audit --audit-level=moderate
```

`npm run check` runs TypeScript validation, ESLint, unit tests, the PWA check, and the optimized Next.js production build.

CI on pull requests and `main` independently runs typecheck, lint, tests, production build, and dependency audit.

## Health endpoints

- `/api/health` — process liveness and configured capabilities
- `/api/ready` — Supabase connectivity readiness

## Important repository setting

The application enforces exact-head approval and merge rules internally, but GitHub branch protection/rulesets should also protect `main` so direct pushes cannot bypass the PR/CI process. This repository setting is external to the application code.

## Documentation

- `docs/SPEC-001-Ziepher-AI.md` — architecture specification
- `docs/OPERATIONS.md` — deployment, monitoring, backup, and incident runbook
- `docs/SECURITY.md` — trust boundaries and required controls
- `docs/RELEASE-CHECKLIST.md` — production and financial activation gates
- `docs/BUILD-MANIFEST.md` — delivered systems and external provisioning gaps
- `docs/INSTALLATION-DELIVERY.md` — active web/PWA and cloud delivery model
- `docs/PROJECT-SYNC-BRIDGE.md` — shared project-sync contract and legacy bridge notes
