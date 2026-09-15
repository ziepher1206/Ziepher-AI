---
name: Core Architecture Proposal
about: Propose a measurable redesign of ZLife Core for performance, stability, reliability, scalability, security, or maintainability
---

## Core problem

What part of ZLife Core should change, and what evidence shows the current design is limiting performance, stability, reliability, cost, scalability, security, or maintainability?

## Affected boundaries

List the core systems, modules, APIs, schemas, workers, clients, providers, or deployment assumptions affected.

## Current baseline

Provide the current measurable baseline where possible: latency, throughput, error/failure rate, memory, CPU, build time, test flakiness, recovery time, provider cost, or another relevant signal.

## Proposed architecture

Describe the new structure/data flow and why it is preferable to smaller alternatives.

## Target improvement

State measurable success criteria. Examples: reduce P95 latency from X to Y, cut error rate below Z, reduce build time by N%, lower provider cost, improve recovery time, or eliminate a documented failure mode.

## Prototype / benchmark plan

Explain how this can be tested safely using forks, branches, mocks, synthetic data, isolated development services, or other non-production resources.

## Migration plan

How would ZLife move from the current design to the proposed design without losing data or breaking active modules?

## Rollback plan

How can maintainers return to the known-good architecture if the redesign fails in testing or after staged release?

## Compatibility impact

What existing APIs, modules, schemas, clients, jobs, tests, or integrations could break? How will compatibility be maintained or migrated?

## Security / privacy / tenancy impact

Call out authentication, authorization, tenant isolation, secrets, customer data, billing, retention, or other security/privacy implications.

## Cost impact

Could this change increase or decrease infrastructure, AI, storage, database, networking, or provider costs? Include estimates or measurements when available.

## Observability

Which metrics, logs, traces, checks, or health signals will prove whether this change is helping or hurting ZLife?

## Staged release plan

Can this ship behind a flag, adapter, shadow path, dual-read/write period, or another reversible mechanism? Explain the safest rollout.

## Contribution interest

- [ ] I can build a prototype.
- [ ] I can provide benchmarks.
- [ ] I can implement the redesign.
- [ ] I can review architecture/security.
- [ ] I can test reliability/performance.
- [ ] Proposal only.

## Public-data check

- [ ] This proposal contains no production secrets, private customer data, passwords, tokens, payment information, or confidential business information.

Core architecture proposals may influence ZLife direction, but submission does not grant production access, merge authority, employment, ownership, equity, compensation, or guaranteed adoption.
