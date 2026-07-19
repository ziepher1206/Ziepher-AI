# Ziepher AI Build Manifest

**Release:** 0.7.0  
**Checkpoint date:** July 18, 2026  
**Product:** Ziepher AI — Build Your Dreams

## Included systems

- Visual, voice-first planning studio with typed input
- Free planning with deterministic, Gemini, and optional OpenAI routes
- Multiple visual directions and responsive live-preview controls
- Supabase authentication, projects, specifications, concepts, storage, RLS, and job queues
- Credit-aware build orchestration with atomic reservation and release
- Deterministic complete-app generator plus AI generation and repair routes
- Docker-oriented isolated runner contracts and security scanning
- Version history, source export, restore, build history, and deployment history
- Preview and production deployment queue with Vercel and manual-delivery providers
- Stripe subscriptions, billing portal, webhook idempotency, and monthly credit grants
- Stripe and Vercel production activation disabled by default
- Revisioned project snapshots, append-only sync events, and optimistic conflict handling
- Realtime project updates with polling fallback and browser-local offline replay
- Durable AI context shared by planning, generation, and repair
- Exact-origin Tauri bridge with a native user-approved workspace boundary
- Guarded local file scanning, hashing, reading, writing, and recovery backups
- Health, readiness, CI, container, security, operations, and release documentation

## Validation completed in this environment

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test` | Passed — 8 tests |
| `npm run build` | Passed — optimized production build |
| `npm audit --audit-level=moderate` | Passed — 0 vulnerabilities |
| `npm run check:sync` | Passed — sync, AI-context, and bridge contracts |
| `npm run check:clients` | Passed — desktop/mobile packaging contracts |
| Generated fallback app type check | Passed |
| Generated fallback app production build | Passed |

The generated-app dependency installation was rerun from the local npm cache after
the online smoke command stalled in this restricted environment. Its type check
and optimized production build both passed.

## External validation still required

These items require operator-owned infrastructure or credentials and therefore
cannot be completed inside this repository alone:

- Provision development, staging, and production Supabase projects.
- Apply and verify all seven migrations, including sync conflict and multi-user RLS behavior.
- Build and run the web container on the intended container platform.
- Run build workers on dedicated Docker-capable hosts.
- Configure approved AI models, quotas, retention settings, and spending limits.
- Configure Vercel credentials and complete staging deployment tests.
- Configure Stripe test products, prices, webhook endpoint, and end-to-end test payments.
- Complete the production release checklist before enabling Stripe or production deployments.

## Checkpoint 0.7.0 — Project Sync Bridge

Added:

- `project_sync_states`, `project_sync_events`, and `project_bridge_devices`;
- idempotent revision-checked sync and bridge registration functions;
- Realtime subscription, reconnect polling, offline queue, and conflict retry;
- project AI context editor and prompt integration;
- guarded Tauri commands for folder approval, scans, reads, and writes;
- compare-before-write hashes and recoverable local backups;
- authenticated sync, context, and bridge API routes.

Validated here:

- TypeScript, ESLint, 8 unit tests, PWA checks, client checks, sync contract
  checks, optimized production build, and npm audit all passed.

Environment-limited:

- the Tauri Rust source could not be compiled because this workspace has no
  `cargo` or `rustc`; the platform release matrix remains the compilation gate;
- the Supabase migration needs an operator-owned development project for live
  RLS, Realtime, and concurrency testing;
- local HTTP smoke startup is blocked by sandbox network-interface discovery,
  after the production compilation and static generation completed successfully.

## Safety defaults

- Planning does not reserve or spend build credits.
- Generated code is treated as untrusted.
- Unsandboxed execution is disabled by default.
- Automated repair is limited and does not add user credit charges.
- Financial integrations are scheduled after core application validation.
- Stripe live billing is disabled until `STRIPE_ENABLED=true`.
- Vercel deployment is disabled until `VERCEL_DEPLOYMENTS_ENABLED=true`.
- Production activation requires explicit operator configuration.


## Checkpoint 0.5.0 — installable clients

Added:

- installable Next.js PWA surface;
- safe service-worker cache boundaries;
- branded PWA and native icons;
- Tauri desktop packaging source;
- Capacitor Android and iOS projects;
- automated desktop and mobile packaging workflow;
- cloud control-plane and worker compose topology;
- dedicated installation-delivery runbook.

Validation evidence:

- root TypeScript, ESLint, unit tests, PWA checks, client-contract checks, and
  optimized Next.js build passed;
- Capacitor TypeScript validation and Android/iOS synchronization passed;
- desktop Rust compilation is delegated to the platform matrix because the
  current build environment does not contain an executable Rust toolchain;
- signed installers and store packages still require operator-owned signing
  credentials and developer accounts.


### Environment-limited checks

The 0.5.0 generated-app smoke test reached dependency installation but the
restricted execution environment could not resolve `registry.npmjs.org`
(`EAI_AGAIN`). The generator itself is unchanged from the previously validated
checkpoint. CI must rerun `npm run smoke:generated` with package-registry access.

The desktop source was not compiled locally because this environment has no
executable Rust toolchain. The release workflow compiles it separately on
Windows, macOS, and Linux runners.
