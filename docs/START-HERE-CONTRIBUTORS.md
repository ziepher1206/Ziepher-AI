# Start Here: Help Build ZLife

ZLife is the main platform built and operated by Ziepher Tech. Tree Service is the first active business module.

This page is the fastest path for someone outside Ziepher Tech who wants to help without needing production access, paid provider accounts, customer data, or internal secrets.

## Ways to help right now

You can contribute by:

- reporting reproducible bugs;
- proposing features or new module ideas;
- documenting real business workflows and edge cases;
- improving documentation and onboarding;
- adding deterministic tests;
- improving accessibility and responsive behavior;
- reviewing public code and identifying safe technical improvements;
- building focused changes from a fork and submitting a Pull Request.

Start with existing public tasks:

- Good first issue: https://github.com/ziepher1206/Ziepher-AI/issues/138
- Beginner testing/accessibility issue: https://github.com/ziepher1206/Ziepher-AI/issues/139
- All open issues: https://github.com/ziepher1206/Ziepher-AI/issues
- Feature proposal: https://github.com/ziepher1206/Ziepher-AI/issues/new?template=feature-proposal.md
- Bug report: https://github.com/ziepher1206/Ziepher-AI/issues/new?template=bug-report.md

## Current priority

The highest-priority work is not adding dozens of new modules. It is making the first ZLife operating path dependable.

Current order:

1. ZLife Core security, permissions, tenant isolation, CI, accessibility, and reliability.
2. Tree Service lead intake and attribution.
3. Customer/property records.
4. Estimate scheduling and availability rules.
5. Estimate creation and acceptance.
6. Job scheduling, crews, and completion.
7. Invoice and Stripe test-mode payment contracts.
8. ZLife Assistant recommendations with approval boundaries.
9. Public contributor tooling and governance.
10. Additional modules after the first operating loop is stable.

## Safe contributor workflow

1. Fork `ziepher1206/Ziepher-AI` to your GitHub account.
2. Clone your fork.
3. Create a focused branch from `main`.
4. Copy `.env.example` to `.env.local`.
5. Keep `ZLIFE_DEV_MODE=true` for ordinary contributor work.
6. Run `npm ci`.
7. Run `npm run smoke:contributor`.
8. Make one focused change.
9. Run `npm run check`.
10. Open a Pull Request against `main` and explain the problem, change, tests, and any security/data impact.

Use fake development data only. Ordinary contribution work should not require Ziepher Tech credentials or paid provider usage.

## Production boundary

Public contributors do not receive direct production access.

Do not request, publish, copy, or commit:

- production customer information;
- Supabase service-role keys;
- Vercel production tokens;
- Stripe secrets or live payment credentials;
- AI-provider production keys;
- email/SMS credentials;
- DNS credentials;
- private session tokens or environment secrets.

Do not make production deployments, live charges, payouts, outbound customer messages, paid ads, or other irreversible provider actions from contributor work.

## Review model

GitHub is the engineering source of truth. Useful outside work should arrive as issues, reproducible evidence, or focused Pull Requests.

Maintainers review changes for:

- correctness;
- security and tenant isolation;
- tests and CI;
- relevance to the current roadmap;
- compatibility with ZLife architecture;
- accessibility and usability where applicable;
- provider-cost and production-safety boundaries.

Raw commit count does not determine contribution value. Verified useful work is what matters.

## Contribution recognition

ZLife tracks verified contributions and is building a Proof of Value system that can represent creation, improvement, maintenance, quality, security, usage, and downstream dependency value.

Current Contribution Shares and reward figures are internal attribution/simulation only. They are not wages, equity, securities, tokens, guaranteed compensation, or an ownership promise.

## Important launch gates still being finalized

Two repository-governance items are tracked separately and must not be silently inferred:

- main-branch protection/ruleset: https://github.com/ziepher1206/Ziepher-AI/issues/93
- repository license and contributor IP terms: https://github.com/ziepher1206/Ziepher-AI/issues/150

Until those are resolved, do not describe ZLife as fully open-source or imply rights/terms that Ziepher Tech has not formally selected.

## Read next

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- `docs/COMMUNITY-ROADMAP.md`
- `docs/PUBLIC-CONTRIBUTOR-LAUNCH.md`
- `docs/ZIEPHER-TREE-SERVICE-LAUNCH.md`

The simplest useful contribution is a small, well-tested improvement that makes the current ZLife platform safer, clearer, more reliable, or easier to use.