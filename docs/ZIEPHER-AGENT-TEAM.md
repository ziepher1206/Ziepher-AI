# Ziepher Tech Agent Team

## Purpose

Ziepher Tech uses one coordinated software-development team made of named specialist agents. A project can be handed to the team once and move through product, domain, architecture, design, engineering, review, release, and support without the customer having to address each specialist manually.

The canonical agent definitions live in `lib/agents/registry.ts`.

## Access

Authenticated Ziepher users can open:

`/team`

The workspace provides:

- a directory of all 22 named agents
- each agent's mission, personality, authority, and escalation boundaries
- a project brief field
- a full-team handoff runner
- visible progress through the default project workflow

## Default project workflow

1. Mason — Product Manager
2. Arbor — Tree Service Industry Specialist
3. Radar — Research / Competitive Intelligence
4. Atlas — CTO / Chief Architect
5. Mira — UI / UX Designer
6. Ledger — Cost / Infrastructure Analyst
7. Pulse — Data & Analytics
8. Rank — SEO / Growth
9. Cipher — AI Engineer
10. Nova — Frontend Engineer
11. Forge — Backend Engineer
12. Ada — Database Engineer
13. Bridge — Integration Engineer
14. Echo — Mobile Engineer
15. Vector — Performance Engineer
16. Quill — Documentation
17. Scout — QA Engineer
18. Sentinel — Security Engineer
19. Judge — Independent Code Reviewer
20. Relay — DevOps / Platform Engineer
21. Launch — Release Manager
22. Beacon — Support / Triage

The order is intentionally not a flat chain of code generation. Early agents clarify the problem and constraints; implementation specialists then build; independent quality/security/review agents challenge the work; DevOps and Release control promotion; Support closes the loop.

## Current execution mode

The initial `/team` runner is a deterministic dry run. It exercises the team order, roles, and handoffs without:

- calling a paid AI model
- changing source code
- changing production
- sending customer communications
- making payments or purchases

This makes the feature safe to validate before enabling paid autonomous execution.

## Live execution design

Live execution should use the same registry and add an orchestrator that creates a durable team run with task-scoped context.

Each specialist receives only:

- the project brief
- relevant project/workspace context
- the outputs required from upstream agents
- the minimum tools needed for its current task
- explicit spend and side-effect permissions

Each agent returns a structured result containing:

- summary
- decisions
- assumptions
- evidence
- proposed actions
- blockers
- escalation requests
- artifacts or code-change references
- verification status

## Approval boundaries

Live team execution must not silently perform high-impact actions.

Explicit approval remains required for:

- new paid services or provider upgrades
- real charges or production billing activation
- real customer email/SMS/phone communication
- paid advertising or social publishing
- destructive or difficult-to-reverse database changes
- production DNS/domain changes
- legal/regulatory decisions
- major product-direction changes

Routine reversible engineering work may proceed through branch → tests → PR → preview → review → merge according to the existing Ziepher build rules.

## Independent gates

The authoring agent does not approve its own work.

- Scout can block for failed acceptance criteria or tests.
- Sentinel can block for security or authorization issues.
- Judge can reject code quality, architecture, or test coverage.
- Relay can refuse to promote a failed build.
- Launch can refuse production release when required gates are incomplete.

## Cost control

A full live 22-agent run can consume materially more model tokens than a single assistant request. Live execution should therefore support:

- per-run maximum AI budget
- per-agent token/output limits
- model routing by task complexity
- cached/shared context rather than repeating full project history
- skipping agents whose specialty is genuinely irrelevant unless the user explicitly requests the full-team review
- a visible estimated cost before a paid full-team run

No live paid mode should be enabled by default until these controls are implemented and approved.
