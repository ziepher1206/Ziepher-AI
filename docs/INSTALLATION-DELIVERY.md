# Ziepher AI installation and cloud-delivery architecture

## End-user promise

A Ziepher user opens Ziepher AI in a browser or installs the web application as a PWA. The user does not install Node.js, Docker, Git, a code editor, Supabase CLI, Stripe CLI, AI SDKs, build tools, or deployment tools.

Planning, source generation, dependency installation, testing, repair, preview publishing, source-control orchestration, storage, and deployment orchestration run in Ziepher-managed services.

## Active delivery channel: HTTPS + PWA

The Next.js application includes:

- `/manifest.webmanifest`;
- 192 px, 512 px, and maskable icons;
- a service worker;
- an offline status page;
- a visible **Install Ziepher** control;
- standalone display mode.

The service worker caches only public application-shell assets. It must not cache API responses, authentication routes, private projects, provider credentials, or generated private previews.

The former Tauri desktop and Capacitor mobile wrappers are not part of the active product or release pipeline. They were removed from the working tree so Ziepher can focus on one browser-first client and one cloud control plane. Historical implementations remain recoverable through Git history if a native client becomes justified later.

## Cloud processes

1. **Web control plane** — authentication, projects, planning, provider connections, repository/deployment settings, review UI, billing interface, and explicit release actions.
2. **Build worker** — private queue consumer that generates code and runs dependency installation, type checking, production compilation, secret scanning, and bounded repair in isolated containers.
3. **Source-control worker** — private queue consumer that creates isolated GitHub changes, opens PRs, checks CI/preview readiness, waits for owner/admin approval, and performs an exact-SHA merge.
4. **Deployment worker** — private queue consumer that publishes approved versions to an explicitly bound Vercel project and reconciles ambiguous provider outcomes without blind duplicate deployment attempts.

Only the build-worker host receives Docker access. The public web service must never receive the Docker socket.

## Deployment identity

A Ziepher project must be bound to a validated Vercel project before a Vercel deployment can be queued. The canonical Vercel project and account IDs are snapshotted into the deployment row when it is created.

Later project settings changes cannot redirect that queued deployment.

Before invoking Vercel, the deployment worker records `provider_attempted_at`. It also attaches the durable Ziepher deployment/project/environment identity as Vercel metadata. Once the attempt marker exists, workers reconcile Vercel state instead of automatically issuing another deployment request for the same row.

## Release gates

Before enabling production releases:

1. deploy the web control plane to its permanent HTTPS origin;
2. operate the build, source-control, and deployment workers on private infrastructure;
3. configure Supabase and run all migrations;
4. configure encrypted GitHub provider credentials and verify repository access;
5. bind the project to the intended Vercel project;
6. keep `VERCEL_DEPLOYMENTS_ENABLED=false` until preview deployment testing is ready;
7. keep `VERCEL_PRODUCTION_RELEASES_ENABLED=false` until preview, checks, approval, merge, and recovery behavior have been tested;
8. protect GitHub `main` with repository rules/branch protection so direct pushes cannot bypass PR/CI policy;
9. run the root validation suite and generated-app smoke build;
10. verify monitoring, backups, and incident/recovery procedures;
11. keep Stripe disabled until the separate financial release gates pass.

## Operator validation

```bash
npm run check
npm run smoke:generated
npm audit --audit-level=moderate
```

The browser/PWA client is the supported end-user installation surface. Native app-store signing, desktop installer signing, Android packaging, and iOS packaging are intentionally outside the active release scope.
