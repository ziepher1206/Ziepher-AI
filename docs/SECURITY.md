# Ziepher AI Security Model

## Trust boundaries

1. Browser and voice input are untrusted.
2. Planning-model output is untrusted.
3. Generated source is untrusted.
4. The public web process cannot execute generated package scripts.
5. Build workers are trusted orchestration services but generated containers are
   disposable and untrusted.
6. The Supabase service role, AI keys, provider-credential encryption key, and
   Stripe secret are server/worker secrets.
7. Workspace-owned GitHub and Vercel credentials are encrypted before database
   persistence and are decrypted only on trusted server/worker paths that need them.
8. Generated applications receive no Ziepher platform or workspace provider secrets.

## Authentication and authorization

- Use Supabase SSR clients with cookie-based sessions.
- Verify the user with `auth.getUser()` on protected server routes.
- Enforce project/workspace membership in RLS and security-definer functions.
- Do not rely on a project ID supplied by the browser without RLS.
- Use separate OAuth clients and callback allowlists per environment.
- Require MFA for production operators and third-party provider accounts.
- Infrastructure connection changes are owner-controlled; project deployment target
  changes are limited to project owners or workspace admins.

## Database

- RLS remains enabled on every user-facing table.
- Webhook-event tables have no client write policy.
- Credit grants, job claims, worker completion, and billing writes are service-role
  operations.
- Security-definer functions set `search_path=public`.
- Every monetary or credit mutation must be transactional and idempotent.
- Test policies with unrelated users before each release.

## Secrets

- Store production machine secrets in the hosting secret manager.
- Never use `NEXT_PUBLIC_` for private values.
- Never log complete environment variables, bearer tokens, OAuth tokens, or provider credentials.
- Never place service-role keys or provider credentials in generated files.
- `ZIEPHER_PROVIDER_CREDENTIALS_KEY` must be a strong 32-byte key, kept outside the database, and available only to trusted server/worker processes.
- Workspace provider access/refresh tokens are encrypted before being stored in `provider_connections` and are never returned by connection-status APIs.
- Customer Vercel deployments must resolve the Vercel credential from the deployment project's workspace; they must never fall back to a global operator Vercel token.
- Rotate credentials after suspected disclosure and mark/revoke affected provider connections.

## Generated source

Validation rejects:

- unsafe or traversal paths;
- oversized projects;
- common private-key and live Stripe-secret patterns;
- service-role references;
- Stripe SDK and money-movement implementation during the core stage.

The dependency install uses `--ignore-scripts`. After installation, the container
loses network access for type checking and production compilation.

## Sandbox

Required production controls:

- dedicated worker nodes;
- non-root container image;
- read-only base filesystem where practical;
- CPU, memory, process, and time limits;
- no platform secrets in generated containers;
- no host networking;
- no privileged containers;
- `no-new-privileges`;
- isolated temporary workspace;
- deletion after the job;
- egress allowlisting during dependency retrieval.

The repository runner implements the main process, memory, CPU, network, and time
limits. Production operators should add seccomp/AppArmor and an egress proxy.

## Preview

Preview HTML is served through an authenticated same-origin gateway with a
restrictive CSP. The iframe uses a sandbox and does not receive `allow-same-origin`.
Preview source must not be inserted into the parent DOM.

## Deployment

The deployment worker accepts only successful immutable versions. Archive paths
are listed and validated before extraction. Each Vercel deployment captures the
canonical Vercel project/account identity when queued. The worker then resolves
only the encrypted Vercel credential connected to that deployment project's
workspace. If a team-scoped connection no longer matches the immutable target,
the worker fails closed. Provider attempts are recorded before the Vercel side
effect, and ambiguous outcomes are reconciled rather than automatically redeployed.
Production deployment remains a separate explicit action.

## Stripe

- Stripe is disabled unless `STRIPE_ENABLED=true`.
- Verify the raw webhook body with the signing secret.
- Claim every event in an idempotency table before processing.
- Use credit-ledger idempotency keys.
- Do not store card data.
- Treat subscription state as asynchronous.
- Handle failed payments and cancellation.
- Keep test and live credentials in separate environments.
- Require the release checklist before live activation.

## Required external review

Before handling paid production customers:

- independent application penetration test;
- generated-code sandbox escape assessment;
- RLS review;
- provider-credential isolation and encryption review;
- billing and credit-ledger review;
- privacy/terms review;
- incident-response tabletop;
- backup and artifact recovery test;
- dependency and container-image scan.
