# ZLife Community Architecture

## Goal

Enable outside developers to build ZLife using their own GitHub, computer, Vercel, Supabase, API accounts, and development resources while keeping Ziepher Tech production systems isolated.

## Trust boundary

```text
Contributor fork / local environment
  -> contributor-owned preview
  -> pull request
  -> automated validation
  -> maintainer review
  -> merge to main
  -> Ziepher-controlled staging / production promotion
```

Community environments must not depend on production customer data, production provider tokens, or direct production deployment privileges.

## Community roles

```text
Community Member
-> Contributor
-> Verified Contributor
-> ZLife Developer
-> Module Maintainer
-> Core Contributor
-> Ziepher Tech / ZLife Core Team
```

Roles are recognition and access-governance concepts unless separately established by formal legal agreements.

## Contribution Ledger model

The ledger records verified contribution events rather than raw activity totals.

Core fields:

- contributor identity
- source repository
- module
- contribution type
- linked PR / issue
- description
- impact, difficulty, scope, maintenance, quality scores
- verified score
- status
- verifier
- timestamps

Derived values can later include lifetime, recent, module, core-platform, and maintenance contribution percentages plus a contributor reward weight.

No reward formula should rely on lifetime points alone.

## Scoring principles

Scores should reward useful verified outcomes and resist gaming. Raw commits, lines changed, issue count, and PR count are evidence only, not direct value.

Maintainer verification should consider impact, difficulty, scope, quality, originality, maintenance value, security importance, reliability, documentation value, review effort, module importance, and ongoing responsibility.

All manual score changes require an auditable adjustment event.

## Module attribution

Every module can eventually associate:

- original creators
- maintainers
- contributors
- verified contribution history
- lifetime and recent module contribution percentages
- maintenance history

Initial module identifiers should remain simple and stable, for example:

- `core`
- `tree-service`
- `ai-assistant`
- `web-builder`
- `app-builder`

Future verticals can be added without requiring a premature plugin marketplace architecture.

## Financial architecture boundary

The data model may prepare for future contributor rewards and global impact accounting, but no real payout behavior is enabled by the community foundation.

Keep these concepts distinct:

```text
Revenue
Operating expenses
Net proceeds
Eligible proceeds
Contributor rewards
Employee compensation
Contractor compensation
Profit distributions
Module rewards
Equity ownership
Charitable allocations
Global Impact distributions
```

Future conceptual flow:

```text
ZLife Revenue
-> Operating Costs
-> Required Reserves / Obligations
-> Global Impact Allocation
-> Contributor Reward Pool
-> Ziepher Tech Retained Proceeds
```

`GLOBAL_IMPACT_PERCENTAGE` is intentionally unset until an approved percentage and accounting/legal structure exist.

## Public community surfaces

Planned public areas can include:

- Build ZLife With Us
- Open Tasks
- Become a Contributor
- Contributors
- Module Maintainers
- Core Team
- Contribution profiles
- Community roadmap
- Development documentation
- GitHub links
- ZLife Impact / Transparency

Public totals must be derived only from verified data. Never fabricate contributors, scores, donations, distributions, recipients, revenue, or impact.

## Cost target

Normal community contribution should add approximately $0 in Ziepher Tech infrastructure cost because contributors use their own local environment, GitHub fork, Supabase project, Vercel preview, and optional provider credentials. Ziepher Tech may still incur existing CI / preview usage associated with reviewing PRs; paid upgrades are not part of this architecture without explicit approval.
