# ZLife community roadmap governance

ZLife is built by Ziepher Tech with an internal AI team and a public contributor community. Public participation can shape product direction, but roadmap decisions must remain evidence-based, secure, reversible where practical, and aligned with the ZLife mission.

## Proposal lifecycle

Public ideas should move through a visible lifecycle:

1. **Submitted** — a bug, feature, workflow, module idea, accessibility improvement, security hardening, documentation need, or other proposal is opened publicly.
2. **Triaged** — maintainers classify the affected ZLife area, urgency, risk, expected users, dependencies, and whether the proposal is safe for community work.
3. **Evidence gathered** — contributors and the AI team can add use cases, reproduction steps, workflow examples, technical constraints, accessibility concerns, cost implications, and implementation options.
4. **Roadmap decision** — maintainers choose `accepted`, `needs-more-evidence`, `duplicate`, `deferred`, or `not-planned` based on verified value rather than popularity alone.
5. **Scoped for build** — accepted work is reduced to a clear first version with acceptance criteria, safety boundaries, test expectations, and ownership.
6. **Built and reviewed** — work proceeds through forks/branches, Pull Requests, CI, preview verification, maintainer review, and Contribution Ledger evidence.
7. **Released or closed** — completed work is documented; rejected or superseded work keeps its decision history so the community can understand why.

## What influences priority

Roadmap priority may consider:

- number of users or workflows affected;
- severity of a bug or operational problem;
- security, privacy, tenant-isolation, accessibility, and reliability impact;
- reduction in user complexity or duplicated tools;
- strength of real-world evidence;
- fit with current ZLife module priorities;
- implementation difficulty and dependency risk;
- ongoing maintenance burden;
- infrastructure and provider cost;
- whether a safe contributor can build it without production access;
- whether it unlocks multiple future capabilities;
- verified contributor/community interest.

Votes, reactions, follower counts, raw comments, or commit volume may help show interest, but they must never be the sole basis for roadmap priority or Contribution Ledger value.

## First active business priority

Tree Service remains the first active business module. Public proposals for future modules are welcome, but they should not silently displace launch-critical Tree Service, ZLife Core, security, permissions, tenant isolation, CI, accessibility, contributor-governance, or reliability work.

## Public shaping vs. protected authority

The community may:

- report bugs and usability problems;
- propose features, workflows, and modules;
- provide domain expertise and real-world examples;
- contribute code, tests, design, research, documentation, accessibility work, and security improvements;
- discuss tradeoffs and implementation options;
- volunteer to maintain accepted areas;
- challenge assumptions with evidence.

The public does **not** automatically receive authority to:

- deploy to production;
- access customer data or provider secrets;
- approve its own Contribution Ledger value;
- spend Ziepher Tech money or credits;
- activate live Stripe, paid AI, SMS, email, advertising, or payout systems;
- change legal, ownership, equity, compensation, licensing, or contributor-IP terms;
- bypass maintainer review, CI, branch protections, or security gates.

## AI team role

The existing 22-agent ZLife team may help triage proposals, reproduce bugs, identify duplicate requests, estimate technical dependencies, prepare implementation branches, add tests, review safety implications, and summarize evidence. AI recommendations are inputs to governance, not an automatic grant of production authority or roadmap priority.

## Contribution credit

Submitting an idea alone does not guarantee Contribution Ledger value. Verified credit can reflect demonstrated product value, research, design, testing, implementation, review, maintenance, documentation, security work, or other measurable contribution. Raw activity and popularity are not substitutes for verified value.

## Decision transparency

When practical, a roadmap decision should explain:

- the user or business problem;
- the affected ZLife module;
- the decision and current status;
- the main evidence considered;
- safety, privacy, cost, or dependency concerns;
- the smallest useful next step;
- what would cause a deferred proposal to be reconsidered.

The goal is a community that can influence ZLife meaningfully without turning product direction into an uncontrolled vote or exposing Ziepher Tech production systems.
