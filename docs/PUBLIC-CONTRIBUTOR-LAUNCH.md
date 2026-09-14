# ZLife public contributor launch gate

This document defines when Ziepher Tech may advertise ZLife as open for public development contributions.

## Public contribution model

Public contributors work through forks and pull requests. They do not receive Ziepher Tech production credentials, direct production deployment access, customer data, billing authority, or unrestricted repository administration.

GitHub is the source of truth for public contribution review. The default contributor path must remain usable with `ZLIFE_DEV_MODE=true`, mock providers, fake data, and contributor-owned development resources.

## Required launch gates

The project is ready to announce as open for public development only when all of the following are true:

- [ ] `main` is protected by a GitHub branch rule or ruleset.
- [ ] Changes to `main` require pull requests.
- [ ] The `validate` GitHub Actions check is required before merge.
- [ ] Force pushes to `main` are blocked.
- [ ] Deletion of `main` is blocked.
- [ ] Review conversations must be resolved before merge.
- [ ] Outside-contributor changes require maintainer review.
- [ ] CI for fork pull requests remains read-only and does not expose repository or production secrets.
- [ ] `CODEOWNERS`, `CONTRIBUTING.md`, `SECURITY.md`, the PR template, and public/community issue templates are present.
- [ ] `npm run smoke:contributor` passes with the repository's zero-cost defaults.
- [ ] `npm run check` passes.
- [ ] Production/provider credentials remain absent from the contributor environment.
- [ ] Contribution Ledger ingestion remains pending by default and does not automatically award verified value.
- [ ] Review/verification actions require a verified maintainer identity.
- [ ] A contributor cannot verify or reject their own contribution.
- [ ] Public contributors cannot directly trigger production deployments, live Stripe charges, payouts, outbound communications, or paid AI/provider usage.
- [ ] Ziepher Tech has selected and documented repository licensing / contributor-use terms; public visibility alone is not treated as permission to reuse or redistribute the code. See issue #150.

## Local readiness command

Run:

```bash
npm run check:public-launch
```

The command checks repository-local launch requirements without calling GitHub, Supabase, Stripe, AI providers, email/SMS providers, or production systems. It verifies required contributor files, fork-safe CI configuration, the zero-cost contributor smoke gate, public intake surfaces, and whether a repository license is present.

A successful local check does **not** replace the manual GitHub and production-boundary checks below. Branch protection and a real fork PR must still be verified against the live repository before the public announcement.

## GitHub rule configuration

Until an administration-capable integration can configure repository rules automatically, the repository owner must enable the following rule for `main` in GitHub:

1. Require a pull request before merging.
2. Require at least one approving maintainer review for outside-contributor changes.
3. Require status check `validate` to pass.
4. Require conversation resolution.
5. Require the branch to be up to date before merging.
6. Block force pushes.
7. Block branch deletion.
8. Keep an owner/admin emergency bypass available to avoid locking out the small maintainer team.

The bypass is for recovery only; normal changes still use pull requests and CI.

## Fork and CI boundary

The CI workflow must use the `pull_request` event, not `pull_request_target`, for untrusted contributor code. Workflow permissions must remain least privilege (`contents: read` unless a reviewed workflow has a documented need for more). Fork PR builds must not depend on production secrets.

Vercel/Supabase/Stripe/OpenAI/Twilio/Resend production credentials must never be copied into contributor forks or public CI environments.

## Contributor identity and review

GitHub OAuth may be used to prove control of a GitHub account. Identity linking must rely on authenticated provider evidence, never display-name or email guessing. Reviewer actions must be attributable to a verified ZLife maintainer identity, auditable, revocable, and protected against self-review.

## Launch procedure

When every required gate above is satisfied:

1. Run `npm run check:public-launch` on current `main`.
2. Run the contributor smoke test and full repository check on current `main`.
3. Verify the `main` ruleset is active.
4. Test a pull request from a separate fork/account with no repository secrets.
5. Confirm CI runs and cannot deploy production or access protected provider credentials.
6. Confirm maintainer review is required before merge.
7. Confirm the Contribution Ledger records merged contribution evidence as pending rather than automatically verified.
8. Confirm approved licensing/contributor-use terms are published and linked from contributor documentation.
9. Publish the public contributor announcement and link contributors to `CONTRIBUTING.md`, `SECURITY.md`, the roadmap-governance document, and the public issue templates.

## What public access does not mean

Opening ZLife to public contributors does not grant employment, partnership, ownership, equity, guaranteed compensation, production access, customer-data access, or authority to represent Ziepher Tech. Any future contributor compensation or proceeds-sharing system requires separate legal, accounting, tax, governance, and technical approval.
