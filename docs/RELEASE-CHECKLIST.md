# Ziepher AI Production Release Checklist

## Code

- [ ] `npm ci` succeeds from a clean checkout.
- [ ] `npm run check` passes.
- [ ] `npm run smoke:generated` passes.
- [ ] `npm audit --audit-level=moderate` reports zero unresolved findings.
- [ ] Web container image builds and starts.
- [ ] `/api/health` and `/api/ready` pass.
- [ ] CI runs on the release commit.

## Supabase

- [ ] Development, staging, and production projects are separate.
- [ ] All migrations have been applied to staging and production.
- [ ] RLS tests cover owners, members, viewers, and unrelated users.
- [ ] Service-role key exists only in server/worker secret stores.
- [ ] Private Storage buckets reject unauthorized reads.
- [ ] Database backups are enabled.
- [ ] Storage backup and restore procedure has been tested.
- [ ] Email and OAuth callback allowlists are correct.

## AI providers

- [ ] Approved models are pinned in environment variables.
- [ ] Provider spend and rate limits are configured.
- [ ] Deterministic fallback works.
- [ ] Build failure releases credits.
- [ ] Repair route succeeds on a known broken fixture.
- [ ] Private content is not stored by providers unless contractually approved.
- [ ] Platform-wide learning remains opt-in.

## Build workers

- [ ] Workers run on dedicated hosts.
- [ ] Docker is installed and patched.
- [ ] Un-sandboxed mode is disabled.
- [ ] Generated containers have no platform secrets.
- [ ] CPU, memory, PID, time, and network restrictions are verified.
- [ ] Egress during installation is monitored or allowlisted.
- [ ] Queue lease recovery is tested.
- [ ] Artifact SHA values are verified.
- [ ] A source archive and preview can be restored.

## Deployment

- [ ] Vercel deployment is tested in staging.
- [ ] Preview and production actions are distinct.
- [ ] Archive path traversal tests fail safely.
- [ ] Deployment failures do not change the current production URL.
- [ ] Previous source version can be redeployed.
- [ ] Custom-domain and TLS ownership procedures are documented.

## Stripe test mode

- [ ] `STRIPE_ENABLED=false` remains the default.
- [ ] Test products and monthly/annual prices are configured.
- [ ] Customer portal settings are configured.
- [ ] Webhook signature verification is tested.
- [ ] Duplicate webhook replay creates no duplicate credit grant.
- [ ] Out-of-order `invoice.paid` and checkout events still grant once.
- [ ] Subscription update and deletion change local state.
- [ ] Failed invoice changes local state to `past_due`.
- [ ] Annual and monthly allocations are correct.
- [ ] Cancellation and refund policies are published.
- [ ] Billing reconciliation report is tested.

## Live financial activation

- [ ] Core application has passed security review.
- [ ] Authentication, authorization, and RLS are verified.
- [ ] Incident and rollback owners are assigned.
- [ ] Live Stripe secrets are stored only in production secret management.
- [ ] Live webhook endpoint is registered and monitored.
- [ ] A low-value real transaction is completed and refunded.
- [ ] Accounting and tax responsibilities have been reviewed.
- [ ] Operator explicitly changes `STRIPE_ENABLED=true`.
- [ ] Generated applications still keep money integrations last.

## Operations and legal

- [ ] Monitoring and alerting are active.
- [ ] On-call and escalation contacts are documented.
- [ ] Database and artifact recovery drill passes.
- [ ] Privacy policy, terms, acceptable-use policy, and data retention are published.
- [ ] User source ownership and third-party license terms are documented.
- [ ] Support and abuse-report channels are active.
