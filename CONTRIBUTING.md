# Contributing to ZLife

ZLife is a community-built platform operated by Ziepher Tech. GitHub is the source of truth for code, review, and verified engineering contributions.

## Production boundary

Community contributors must work from forks or contributor branches and must not require access to Ziepher Tech production infrastructure. Do not request, copy, or commit production customer data, Supabase service-role keys, Vercel production tokens, Stripe secrets, OpenAI keys, Resend keys, Twilio credentials, DNS credentials, or other production secrets.

No community contributor may deploy directly to production. Production promotion remains a maintainer-controlled action after review, CI, preview verification, and release gates.

## Standard workflow

1. Fork this repository to your GitHub account.
2. Clone your fork locally.
3. Create a feature branch from `main`.
4. Copy `.env.example` to `.env.local`.
5. Keep `ZLIFE_DEV_MODE=true` for ordinary community development.
6. Use your own Supabase project and your own provider credentials only when a feature genuinely requires them.
7. Prefer mock/dev-mode providers for UI, forms, dashboards, navigation, workflows, tests, and module development.
8. Run `npm ci`.
9. Run `npm run smoke:contributor` to verify the default zero-cost contributor environment before development.
10. Run `npm run check` before opening a PR.
11. Open a focused Pull Request against `main`.

### Zero-cost contributor smoke test

`npm run smoke:contributor` is intentionally local and deterministic. It does not call OpenAI, Google AI, Stripe, Supabase, email, SMS, notification, or other paid provider APIs. It verifies that:

- the supported Node version is in use;
- `ZLIFE_DEV_MODE` is enabled in `.env.example`;
- AI, email, SMS, payment, and notification mocks are enabled;
- production/provider secret values are blank in the default contributor environment; and
- the repository exposes the required typecheck, lint, test, and build scripts.

If the smoke test fails, correct the local contributor configuration rather than adding production credentials. Contributors may configure their own development-only provider accounts for work that genuinely requires them, but that is outside the default zero-cost path.

## Contribution quality

Meaningful contributions can include code, architecture, modules, security, UI/UX, documentation, tests, reviews, maintenance, product design, infrastructure, community support, and other verified work that materially improves ZLife.

Contribution value is not based on raw commit count. Commit spam, artificial issues, repeated trivial PRs, generated noise, or changes designed primarily to inflate contribution metrics are not eligible for contribution credit.

## Contributor progression

Community recognition may progress through:

`Community Member -> Contributor -> Verified Contributor -> ZLife Developer -> Module Maintainer -> Core Contributor -> Ziepher Tech / ZLife Core Team`

These are project/community roles. They do not by themselves create employment, contractor status, partnership, equity, ownership, agency authority, or guaranteed compensation.

## Contribution Ledger

Merged work may create verified Contribution Ledger events. Events can record contribution type, source repository/module, linked PR or issue, impact, difficulty, scope, quality, maintenance value, verification status, and audit history. Scores are intended to recognize meaningful verified value rather than activity volume.

Manual score adjustments must be attributable and auditable.

## Future contributor rewards

Ziepher Tech intends to design a future contributor-reward system that can consider verified lifetime contribution, recent activity, module-specific work, maintenance responsibility, impact, quality, and current responsibility. No payout percentage, guaranteed payment, employment relationship, ownership interest, or profit-sharing right is created by contributing today.

Legal, accounting, tax, licensing, contributor-ownership, CLA, equity, and reward-distribution terms remain separate decisions and are not established by this document.

## Pull Request expectations

A PR should explain what changed, why it matters, which module or core area it affects, how it was tested, and any security/data implications. Keep unrelated refactors out of feature PRs where practical.

Never include real customer information in tests, screenshots, fixtures, logs, or examples. Use clearly fake development data only.
