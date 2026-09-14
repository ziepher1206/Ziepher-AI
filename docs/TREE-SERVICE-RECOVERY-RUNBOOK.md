# Tree Service Recovery Runbook

This runbook defines the minimum recovery procedure for the first ZLife Tree Service pilot. It is intentionally provider-aware but does not contain production credentials, customer data, or destructive commands.

## Scope

Recovery covers three independent failure classes:

1. application regression or bad production release;
2. database/schema or data-integrity incident;
3. provider/integration failure involving deployment, payments, email/SMS, AI, or another external dependency.

The first response is always to contain impact before attempting repair.

## Safety rules

- Never paste production secrets, service-role keys, customer data, payment data, or session tokens into issues, PRs, screenshots, logs, or public chat.
- Never run a destructive database command as a first response.
- Never promote an unreviewed build directly to production during incident response.
- Keep Stripe in test mode until launch approval.
- Keep outbound email/SMS/social publishing disabled unless explicitly approved.
- Prefer rollback to the last verified release over emergency forward-fixes when the failure affects customer workflows or data integrity.
- Record the exact deployment SHA, database migration state, incident start time, and actions taken.

## 1. Application rollback

Use this when the application is unhealthy but the database remains consistent.

### Detect

Confirm at least one of the following:

- production route failures;
- broken authentication/navigation;
- lead, estimate, job, invoice, or payment workflow regression;
- a deployment health check failure;
- a verified regression introduced after the previous known-good SHA.

### Contain

1. Stop further production promotion.
2. Record the current production commit/deployment identifier.
3. Identify the most recent known-good deployment whose CI and verification completed successfully.
4. Confirm no database migration in the failed release makes rollback incompatible.

### Roll back

Use the deployment provider's supported rollback/promote-previous-deployment mechanism. Do not rebuild from an unverified local tree.

### Verify

After rollback, verify:

- home/login routes respond;
- workspace access still respects tenant boundaries;
- Tree Service lead intake works in the approved test path;
- estimate/job/invoice pages load;
- Stripe remains test-only;
- no paid provider or outbound communication was unintentionally enabled;
- the deployed SHA matches the intended known-good candidate.

## 2. Database backup and restore verification

This must be rehearsed before broad customer launch. A backup is not considered verified merely because a provider reports that backups exist.

### Before the drill

1. Identify the approved source environment and approved restore target.
2. Confirm the restore target is isolated from production customers and production credentials.
3. Record the source project identifier, backup timestamp, and expected migration version.
4. Freeze schema changes for the duration of the drill.

### Restore drill

Use the database provider's supported backup/restore or point-in-time recovery mechanism. Restore into an approved non-production target whenever possible.

### Validate the restored target

Verify at minimum:

- expected schemas/tables exist;
- migration history matches the backup point;
- workspace/business/project records retain tenant ownership relationships;
- Tree Service leads, customers, properties, appointments, estimates, jobs, invoices, and payment records preserve referential integrity;
- RLS remains enabled where expected;
- SECURITY DEFINER and worker-only execution boundaries have not changed unexpectedly;
- no production service-role credential is copied into a public or contributor environment.

Use fake or approved non-production data for functional verification whenever possible.

### Restore acceptance record

Record:

- backup point used;
- restore target;
- start/end timestamps;
- migration version observed;
- validation results;
- any missing objects, policy drift, or integrity errors;
- operator/reviewer identity.

A restore drill is PASS only when the restored environment can be validated independently and no critical security/tenant-integrity drift is found.

## 3. Schema or data-integrity incident

Use this when application rollback alone is insufficient.

1. Stop new writes to the affected workflow if a safe feature flag or maintenance boundary exists.
2. Preserve logs and the current database state before making repairs.
3. Identify the migration, function, policy, or write path that introduced the problem.
4. Prefer a reviewed corrective migration over manual production edits.
5. If restore is required, use the most recent verified backup/point-in-time recovery position that minimizes data loss.
6. Re-run tenant-isolation, RLS, privileged-RPC, Tree Service workflow, and schema-contract checks before resuming normal operation.

Do not improvise destructive SQL from a public issue or contributor PR.

## 4. Stripe/payment incident

Until launch approval, Stripe remains in test mode.

If a payment-flow regression occurs:

1. disable the affected payment action if possible without impacting unrelated workflows;
2. capture test event IDs and application logs without exposing secrets;
3. confirm webhook signature verification and idempotency behavior;
4. test repeated, failed, refunded, canceled, partial/stage, and successful paths;
5. confirm invoice state is derived from verified settlement events rather than untrusted browser input;
6. restore normal test-mode operation only after the regression suite passes.

No live charge, refund, transfer, or payout is part of this runbook without explicit approval.

## 5. External provider outage

For Vercel, Supabase, AI, email, SMS, or other provider outages:

- distinguish ZLife code failure from provider failure;
- avoid repeated automated retries that could create cost, duplicate messages, or duplicate writes;
- degrade to read-only/mock/deferred behavior where supported;
- keep high-impact actions approval-gated;
- document the provider incident and the ZLife user impact separately.

## 6. Recovery verification checklist

Before declaring recovery complete:

- [ ] Production SHA/deployment is known and recorded.
- [ ] CI for the recovery candidate is green.
- [ ] Exact-SHA release/rollback identity is verified.
- [ ] Authentication and workspace access work.
- [ ] Tenant-isolation and RLS checks pass.
- [ ] Privileged RPC contract checks pass.
- [ ] Tree Service lead → estimate → job → invoice flow passes in the approved test environment.
- [ ] Stripe is still test-only unless separately approved for live mode.
- [ ] No real outbound email/SMS/social action fired unintentionally.
- [ ] Database migration state is known.
- [ ] Backup/restore status is recorded.
- [ ] Incident notes contain no secrets or customer-sensitive data.
- [ ] A maintainer reviewed the recovery before normal operations resume.

## 7. Evidence required before controlled pilot

The controlled Tree Service pilot should not be considered recovery-ready until the repository has evidence of:

- a successful restore drill against an approved restore target;
- a successful application rollback drill;
- exact deployment SHA verification;
- passing tenant-isolation/security regression coverage;
- passing Stripe test-mode webhook/idempotency validation;
- a documented owner/maintainer escalation path.

This document is a procedure and checklist. It does not claim those drills have already been completed.
