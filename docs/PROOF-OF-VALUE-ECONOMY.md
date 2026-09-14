# ZLife Proof of Value Economy

## Purpose

ZLife should let people build durable economic value inside the platform without reducing contribution to hours worked, commit counts, or equal revenue sharing.

The core idea is **Proof of Value**: verified contributions can be linked to the modules, components, workflows, datasets, designs, translations, security fixes, research, testing, and other assets they materially improve. ZLife then measures how those assets continue to create value over time.

This document defines the product and data model only. It does **not** create legal equity, securities, wages, profit-sharing rights, tokens, transferable assets, or real-money payouts.

## Core primitives

### Value Asset
A durable unit of ZLife functionality or intellectual work that can create measurable value. Examples:
- scheduling engine
- estimating workflow
- AI assistant skill
- Tree Service module feature
- shared authentication component
- security control
- design system
- translation pack
- dataset or evaluation suite

### Contribution Share
An internal attribution unit that records how much verified contribution weight a person has in a Value Asset.

Contribution Shares are:
- non-transferable
- not cryptocurrency
- not legal equity
- not a promise of compensation
- auditable and versioned
- suitable for future simulation of reward policies

### Value Graph
The graph connecting:
- contributors
- contribution events
- value assets
- modules
- usage/value measurements
- downstream dependencies

### Value Lineage
A directed relationship between Value Assets. If a downstream asset depends materially on an upstream asset, ZLife can preserve that relationship when simulating future reward allocation.

Example:

`scheduling-core -> tree-service-booking -> landscaping-booking -> AI-optimization`

This allows foundational work to remain visible when later modules create value from it.

## Share classes

ZLife should support multiple contribution-share classes because different kinds of work deserve different behavior.

### Creation
Long-lived attribution for originating a useful asset or major capability.

### Improvement
Attribution for materially increasing usefulness, performance, accessibility, adoption, or business value.

### Maintenance
Time-sensitive attribution for keeping an asset healthy. Maintenance weight may decay when active maintenance stops.

### Quality
Attribution for reliability, testing, performance, accessibility, documentation, and user-outcome improvements.

### Security
Attribution for verified security work, vulnerability remediation, and protective controls.

### Adoption
Attribution for contributions such as translation, ecosystem integration, onboarding, and other work that measurably expands useful adoption.

## Value measurements

A Value Asset can receive time-windowed measurements. Examples include:
- active users
- executions
- successful outcomes
- reliability
- retained usage
- revenue influenced
- cost saved
- incident reduction
- downstream dependency usage
- user satisfaction

No single metric should determine value. Raw usage and raw revenue are insufficient by themselves.

Measurements should preserve:
- source
- time window
- confidence
- provenance metadata

## Decay and durability

Creation attribution should generally be durable.

Maintenance, quality, and adoption attribution may decay or be superseded if the contribution no longer reflects current work.

Decay must be explicit and policy-driven. Historical contribution records remain immutable even when active reward weight changes.

## Reward simulation

Before ZLife enables any real economic rights, it should support **simulation-only** allocation runs.

A simulation may answer:
- If 25% of a hypothetical module reward pool were allocated today, how would it distribute?
- How much comes from direct asset contribution versus downstream lineage?
- How does maintenance decay affect allocations?
- Are a small number of contributors becoming over-concentrated?
- Are low-quality high-usage assets receiving too much simulated reward?

Simulation outputs are not payouts and must be clearly labeled as hypothetical.

## Anti-gaming safeguards

The system must not reward:
- commit count
- lines of code
- issue volume
- duplicated work
- artificial usage
- self-reported revenue influence without evidence

Important safeguards:
- only verified contribution events can mint share events
- share changes are append-only
- manual overrides require reason + reviewer identity
- value measurements keep provenance and confidence
- lineage relationships require review or trusted automation
- inactive maintenance attribution can decay
- rejected or superseded contribution evidence cannot increase active allocation
- simulations should expose concentration and anomaly warnings

## Contributor portfolio

A future contributor dashboard should show:
- verified contributions
- active Value Assets
- share classes and current weights
- module involvement
- downstream lineage
- value trends
- hypothetical reward simulations
- maintenance responsibilities

The long-term user experience should make a contributor's body of work feel like a portfolio of productive digital assets while avoiding any implication of guaranteed income until Ziepher Tech establishes the necessary legal and financial framework.

## Initial implementation phases

### Phase 1 — attribution foundation
- Value Assets
- contributor-to-asset share ledger
- Value Lineage
- time-windowed value measurements
- simulation tables
- server-only access

### Phase 2 — scoring engine
- policy-versioned weighting
- maintenance decay
- lineage propagation
- quality/security multipliers
- anti-gaming checks

### Phase 3 — contributor UX
- portfolio page
- asset detail page
- lineage visualization
- transparent scoring explanations
- hypothetical reward simulator

### Phase 4 — economic/legal design
Only after legal, tax, securities, IP, employment/contractor, and governance review:
- define whether any real compensation rights exist
- define eligible contributor classes
- define funding pools
- define payout cadence and tax handling
- define dispute and appeals process

## Product principle

**Build value once. Keep credit while that value keeps working. Earn more influence by continuing to improve the ecosystem.**
