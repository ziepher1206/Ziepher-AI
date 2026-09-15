# ZLife Build Progress and Contributor Task Briefs

## Purpose

Every active ZLife module, feature, public destination, internal company build, and community contribution should expose a visible completion state. Contributors should also receive a detailed plain-English task brief before claiming or starting work.

## Progress rule

Completion percentages must be derived from explicit milestones, not manually typed guesses or elapsed time.

For each tracked build item, ZLife stores:
- name and stable key
- owner: Ziepher Tech, Community, or Shared
- lifecycle state: planned, building, testing, review, ready
- milestone list with complete/incomplete evidence
- next required outcome
- links to related module, task, PR, preview, review, or release evidence when available

The displayed percentage is:

`completed milestones / total milestones * 100`

A percentage is a build-readiness indicator, not a promise of remaining calendar time.

## Public home experience

Any homepage/module button associated with an unfinished area should show:
- completion percentage
- compact progress bar
- current lifecycle state
- next major outcome

A visitor should be able to understand at a glance what is live, what is still being built, and how much verified work remains.

## Module-level experience

Each installed or browsable module should expose overall completion plus nested progress for meaningful internal capabilities. Example for a Landscaping module:

- Landscaping module — 61%
- Website — 90%
- Leads — 70%
- Scheduling — 55%
- Estimates — 80%
- Invoicing — 45%
- Marketing — 35%

These percentages should be backed by milestones specific to each capability.

## Contributor jobs

Every job/task offered to an outside developer, designer, tester, researcher, translator, industry expert, or AI contributor must provide a written task brief before assignment.

Required fields:
1. Task title
2. Why this matters
3. Current problem
4. Desired outcome
5. Exact scope
6. Out of scope
7. Relevant module/system context
8. Suggested files/areas when known
9. Dependencies and blockers
10. Acceptance criteria
11. Required tests/evidence
12. Preview instructions
13. Security/permission limits
14. Definition of done
15. Estimated difficulty, not time promise
16. Required skills or domain knowledge
17. Progress milestones for the task itself
18. Review path and who/what validates completion

## Assignment flow

`Discover task -> read full brief -> understand why it matters -> claim/assign -> work in safe branch/sandbox -> progress updates -> preview -> test -> submit evidence -> review -> verified completion -> parent module percentage updates`

## Progress propagation

Task progress should roll upward through the system:

`Task -> capability -> module -> platform area -> public/home progress summary`

Only verified milestones should increase parent completion percentages.

## Transparency rules

- Do not inflate progress to make ZLife look more finished.
- Do not call something 100% if required production protections, tests, migrations, permissions, documentation, or release review remain incomplete.
- A failed regression can reduce completion if a previously completed milestone is no longer valid.
- Public progress may be summarized, while internal contributor views can show detailed evidence.
- Sensitive security findings and private implementation details must never be exposed merely to support a public percentage.

## Long-term automation

The future Progress Engine should reconcile GitHub PRs, CI, preview deployments, Supabase migration/readiness state, review outcomes, and structured ZLife task records. AI may propose milestone state changes, but milestones affecting public readiness should be evidence-backed and auditable.
