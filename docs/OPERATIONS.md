# Ziepher AI Operations Runbook

## Services

Production runs three separately scalable services:

| Service | Command | Network exposure |
|---|---|---|
| Web | `npm start` | Public through TLS load balancer |
| Build worker | `npm run worker` | Private outbound only |
| Deployment worker | `npm run deploy-worker` | Private outbound only |

The build worker must run on a dedicated host with Docker. Do not colocate it
with the public web process.

## Environments

Maintain separate Supabase projects and machine secrets for development, staging,
and production. Never copy production service-role, provider-credential encryption,
Stripe, or AI keys into development. Workspace-owned GitHub/Vercel credentials are
stored encrypted in the environment's own Supabase database and must not be copied
between environments as a shortcut.

Recommended release path:

```text
feature branch → CI → development → staging migration → staging smoke build
→ production migration → web rollout → worker rollout → post-deploy checks
```

## Database migrations

Before applying a migration:

1. Review it in a pull request.
2. Apply it to development.
3. Run the complete planning/build/version/restore flow.
4. Apply it to staging.
5. Take a production database backup.
6. Apply with the Supabase CLI.
7. Verify `/api/ready`.
8. Verify RLS using both owner and unrelated test users.

Migrations are forward-only. Correct a deployed migration with a new migration;
do not edit history after production.

## Startup

Web:

```bash
npm ci
npm run build
npm start
```

Build worker:

```bash
npm ci
npm run worker
```

Deployment worker:

```bash
npm ci
npm run deploy-worker
```

## Health checks

- `GET /api/health` should return HTTP 200.
- `GET /api/ready` should return HTTP 200 when Supabase is reachable.
- Alert on three consecutive readiness failures.
- Alert when queued build or deployment age exceeds ten minutes.
- Alert when a worker has no successful claim or poll for five minutes.
- Alert on webhook failure records, repeated build failures, or credit-ledger
  constraint errors.

## Logs

Ship structured stdout/stderr to the central logging platform. Redact:

- authorization headers;
- cookies and session tokens;
- API keys and workspace provider tokens;
- generated environment files;
- source code from private projects;
- Stripe payload fields not required for troubleshooting.

Retain security and billing audit logs longer than normal application logs.

## Backups

Configure Supabase automated database backups. Separately back up private Storage
objects and metadata because database-only recovery does not restore source
archives.

Quarterly recovery drill:

1. Restore the database into an isolated project.
2. Restore Storage objects.
3. verify project membership and RLS;
4. download a historical source version;
5. render a preview;
6. restore an older version into a new checkpoint;
7. verify credit ledger balances.

Record recovery time and recovery point results.

## Build worker incident

When generated builds fail broadly:

1. Disable new build creation at the load balancer or feature flag.
2. Leave planning available.
3. Inspect failure rate by model and strategy version.
4. Roll back model or prompt configuration.
5. verify Docker image availability and registry/network health;
6. release leases for dead workers only after confirming they are stopped;
7. retry representative jobs without charging users;
8. restore building gradually.

Never bypass sandboxing to recover production capacity.

## Deployment incident

1. Stop deployment workers.
2. Keep source export and previews available.
3. Identify the affected project's workspace and inspect its sanitized Vercel connection status.
4. Reauthorize or revoke that workspace's Vercel credential if required; do not substitute an operator/global token.
5. Confirm the immutable deployment target snapshot still matches the intended Vercel project/account.
6. Confirm the source version remains downloadable.
7. For an ambiguous provider attempt, allow reconciliation to resolve the existing Ziepher deployment ID; do not manually create a second deployment until provider state is understood.
8. Resume with preview deployments first.
9. Promote to production only after health validation.

## Stripe incident

1. Set `STRIPE_ENABLED=false` for new checkout/portal requests.
2. Continue accepting signed webhooks if possible.
3. Inspect `billing_webhook_events` for failed processing.
4. Fix the handler, then replay failed Stripe events.
5. Reconcile subscriptions against Stripe.
6. Reconcile each credit grant by idempotency key.
7. Never manually adjust credits without a ledger entry.

## Rollback

Web: deploy the previous tested image.

Database: use a new corrective migration; avoid destructive down migrations.

Build strategy: restore the previous model and prompt environment values.

Generated project: use the History page to restore an immutable source snapshot,
which creates a new project version.

Deployment: redeploy the last known-good source version or use the hosting
provider's rollback after confirming the workspace provider credential and
immutable target identity still match.

## Capacity

Scale web instances by request load. Scale build workers by queue age, not web
traffic. Set provider concurrency limits below account quotas. Apply per-workspace
rate limits and maximum simultaneous builds.

## Scheduled maintenance

Daily:

- inspect failed builds/deployments/webhooks;
- inspect queue age and worker health;
- inspect provider spend and anomalous credit use.

Weekly:

- review dependency advisories;
- sample successful generated applications;
- review repair causes and model performance;
- verify backups.

Monthly:

- run `npm audit`;
- rotate non-user-facing machine credentials where practical;
- review provider connections that need attention or have been revoked;
- test a staging database and artifact restore;
- reconcile Stripe subscriptions and credit ledger;
- review RLS and service-role usage.
