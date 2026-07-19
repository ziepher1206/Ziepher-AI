# Ziepher AI

**Build Your Dreams**

Ziepher AI is a visual, voice-first AI application builder. Users can plan an
application for free, compare multiple visual directions, generate a complete
Next.js project, test it in an isolated runner, preview it, restore earlier
versions, export the source, and deploy it from one workspace.

This repository is production checkpoint **0.7.0**. It includes a
standalone local working mode: planning, visual selection, app generation,
interactive preview, browser persistence, and app download work without an
account, Supabase, Docker, or AI-provider keys. Cloud accounts are only needed
for shared projects, hosted build workers, deployment, and billing.

Checkpoint 0.7.0 adds revisioned shared project state, Realtime and offline
recovery, built-in AI project memory, and the guarded local desktop bridge
foundation. See `docs/PROJECT-SYNC-BRIDGE.md`.





## Run the working local version on Windows

1. Extract the ZIP to a normal local folder such as `C:\ZiepherAI`.
2. Double-click `RUN-ZIEPHER-WINDOWS.bat`.
3. Open `http://localhost:3000` if the browser does not open automatically.
4. Type an idea, choose **Create free plan**, select a visual direction, and
   choose **Build app**.
5. Test the generated application in the right panel or choose **Download app**
   to save a standalone `.html` application.

Local mode saves the current project in the browser. It does not require sign-in.
The generated app has working navigation, item creation, completion, deletion,
search, theme switching, responsive layouts, and local data persistence.

## One-click end-user delivery

Ziepher AI is now designed so customers install only Ziepher AI. They do not
install Node.js, Docker, Git, Supabase CLI, Stripe CLI, or AI-provider tools.

- The web application is an installable PWA with an **Install Ziepher** button.
- `clients/desktop` packages signed Windows, macOS, and Linux installers.
- `clients/mobile` contains synchronized Android and iOS Capacitor projects.
- `.github/workflows/release-clients.yml` builds release artifacts in CI.
- `deploy/cloud` runs the web control plane and private workers in the cloud.

The local requirements below are for Ziepher operators and contributors only,
not for end users. See `docs/INSTALLATION-DELIVERY.md`.

## Implemented

- Standalone local working mode with no account requirement
- Interactive single-file application generation and download
- Browser-local project autosave and recovery
- Working generated navigation, forms, search, theme control, and data storage
- Voice and typed idea capture
- Eight starter-template categories
- Free planning with Gemini, optional OpenAI fallback, and deterministic fallback
- Multiple visual directions, screen maps, features, and build phases
- Persistent Supabase projects, conversations, specifications, and concepts
- Revisioned shared project snapshots and append-only sync events
- Live Supabase Realtime updates with polling and offline-queue recovery
- Conflict-safe, idempotent project state patches
- Built-in AI context shared by planning, generation, and repair routes
- Registered desktop bridge devices and project checkpoint hashes
- User-approved local workspace scanning, guarded reads/writes, and backups
- Email/password, magic-link, and Google OAuth sign-in
- Approved-spec build queue with atomic credit reservation
- Cheapest-best model routing
- Complete deterministic application generator
- Gemini and OpenAI code-generation routes
- Docker-isolated dependency installation, type checking, and production builds
- One automatic AI repair cycle by default
- Secret scanning and financial-integration ordering checks
- Private source and preview artifacts in Supabase Storage
- Live right-side preview
- Version history, source export, restore, build history, and deployment history
- Vercel preview and production deployment queue
- Stripe subscription checkout, portal, idempotent webhooks, and credit grants
- Stripe hard-disabled until explicitly enabled
- Health and readiness endpoints
- Installable PWA manifest, icons, service worker, offline page, and install prompt
- Tauri 2 desktop clients for Windows, macOS, and Linux
- Capacitor 8 Android and iOS native projects
- CI packaging workflow for desktop, Android, and iOS validation
- Cloud compose topology for web, build-worker, and deployment-worker services
- CI, standalone Next.js output, and web/worker Dockerfiles

## Architecture

Run three independent processes:

1. **Web application** — interface, authentication, planning, project APIs,
   billing APIs, and authenticated preview gateway.
2. **Build worker** — claims build jobs, generates source, runs isolated quality
   gates, repairs failures, and publishes versioned artifacts.
3. **Deployment worker** — claims successful versions and sends them to Vercel
   or produces a manual source-delivery record.

Generated package scripts never execute inside the Next.js web process.

## Requirements

- Node.js 22.16 or later
- npm 10 or later
- A Supabase project
- Supabase CLI for migrations
- Docker on each build-worker host
- Optional Google AI and OpenAI API credentials
- Optional Vercel deployment token
- Optional Stripe test-mode account

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

The unauthenticated planning interface can run without Supabase or AI keys. The
full saved-project and build workflow requires Supabase.

## Supabase setup

Install and authenticate the Supabase CLI, then link a development project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Apply all migrations in `supabase/migrations` in order. They create:

- profiles, workspaces, members, and projects;
- specifications, visual concepts, conversations, and messages;
- build jobs, steps, credits, artifacts, versions, and learning records;
- private Storage buckets and RLS policies;
- deployment orchestration;
- subscription and webhook records;
- project sync snapshots, event history, and desktop bridge registrations.

Set these values in `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or a generated project.

In Supabase Auth, add the application callback URL:

```text
http://localhost:3000/auth/callback
```

For Google sign-in, enable the Google provider in Supabase and configure its
OAuth client. Production callback URLs must also be allowlisted.

## Shared projects and desktop bridge

Authenticated projects synchronize their prompt, plan, visual selection, build
quality, preview device, current version, AI context, and bridge checkpoint.
The browser subscribes to live snapshot updates and queues offline writes until
the connection returns.

The installed Tauri app shows **Connect local folder**. The user approves one
folder through the operating system picker. Ziepher can then scan that folder,
read small UTF-8 files, and perform compare-before-write updates with automatic
recovery copies. It cannot request an arbitrary filesystem root from the web
page. Full behavior and APIs are documented in `docs/PROJECT-SYNC-BRIDGE.md`.

## AI routing

Planning is free to the Ziepher user. The default routing order is:

```text
deterministic reuse → low-cost Gemini planning → Gemini build model
→ configured OpenAI fallback → stronger repair/escalation model
```

Configure any subset:

```text
GOOGLE_AI_API_KEY=
GOOGLE_PLANNING_MODEL=gemini-3.1-flash-lite
GOOGLE_BUILD_MODEL=gemini-3.5-flash
GOOGLE_ESCALATION_MODEL=gemini-3.1-pro-preview

OPENAI_API_KEY=
OPENAI_PLANNING_MODEL=
OPENAI_BUILD_MODEL=
OPENAI_ESCALATION_MODEL=
```

OpenAI model IDs are intentionally not assumed. Pin approved model IDs in the
environment so production behavior does not change silently.

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
BUILD_WORK_ROOT=.ziepher-builds
```

Use a dedicated worker host. Do not mount the Docker socket into the public web
container. `ALLOW_UNSANDBOXED_RUNNER=true` exists only for deliberate local
development and must not be enabled in production.

## Deployment worker

Vercel deployment is disabled by default. After a build has produced a successful
version:

```text
VERCEL_DEPLOYMENTS_ENABLED=true
VERCEL_TOKEN=
VERCEL_TEAM_ID=
DEPLOYMENT_WORKER_ID=deployment-worker-1
DEPLOYMENT_WORKER_POLL_MS=5000
```

Then run:

```bash
npm run deploy-worker
```

The worker downloads the private source archive, validates its paths, extracts
it in a temporary directory, and invokes a pinned Vercel CLI version. Preview
deployments are the default; production deployment requires the explicit
**Go live** action.

## Stripe — final integration stage

Stripe remains off:

```text
STRIPE_ENABLED=false
```

Only after the core product, RLS, build workers, recovery tests, and deployment
checks pass should an operator configure Stripe test mode:

```text
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_BUILDER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_BUILDER_ANNUAL_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
```

Register this webhook endpoint:

```text
/api/billing/webhook
```

Handled events include checkout completion, subscription changes and deletion,
successful invoices, and failed invoices. Webhook events and credit grants are
idempotent. Annual subscriptions receive the annual credit allocation.

Keep Stripe in test mode until the release checklist in
`docs/RELEASE-CHECKLIST.md` is complete. Turning `STRIPE_ENABLED=true` enables
the platform billing routes; it does not automatically insert live credentials
into generated applications.

## Validation

```bash
npm run check
npm run smoke:generated
npm audit --audit-level=moderate
```

`npm run check` performs TypeScript validation, ESLint, unit tests, and an
optimized Next.js production build. `npm run smoke:generated` generates a new
application with Ziepher's deterministic builder, installs its dependencies,
type-checks it, and builds it.

## Health endpoints

- `/api/health` — process liveness and configured capabilities
- `/api/ready` — Supabase connectivity readiness

## Container image

Build the web application:

```bash
docker build -t ziepher-ai-web .
docker run --rm -p 3000:3000 --env-file .env.production ziepher-ai-web
```

Build workers should run on separate hardened hosts with Docker available.

## Documentation

- `docs/SPEC-001-Ziepher-AI.md` — complete architecture specification
- `docs/OPERATIONS.md` — deployment, monitoring, backup, and incident runbook
- `docs/SECURITY.md` — trust boundaries and required controls
- `docs/RELEASE-CHECKLIST.md` — production and financial activation gates
- `docs/BUILD-MANIFEST.md` — delivered systems, validation evidence, and external provisioning gaps
- `docs/INSTALLATION-DELIVERY.md` — PWA, desktop, mobile, cloud, signing, and store-release design
