# External ZLife Core Architecture Contributions

ZLife welcomes serious outside proposals that improve the platform's core performance, reliability, maintainability, security, cost efficiency, or scalability. Core architecture work is allowed, but it follows stricter gates than ordinary feature work because changes can affect the entire operating system.

## What counts as core architecture

Examples include shared data flow, database structure, caching, queues, background jobs, agent orchestration, API boundaries, module contracts, authentication/authorization foundations, tenancy, observability, build/release systems, runtime performance, fault isolation, storage strategy, and other cross-platform infrastructure.

## What outside contributors may do

Outside contributors may inspect the public codebase, benchmark safe development environments, propose alternative architecture, build prototypes in forks/branches, add migration tooling, improve tests, run load/reliability experiments, and submit PRs backed by evidence.

They do not receive production secrets, customer data, direct production deployment access, live billing credentials, or authority to bypass review gates.

## Core Architecture Proposal workflow

1. **Proposal first.** Open a `Core Architecture Proposal` issue before a large structural rewrite.
2. **Define the problem.** Include the current bottleneck/failure mode and the evidence showing it matters.
3. **Set measurable targets.** Define expected improvements such as latency, throughput, error rate, memory use, build time, cost, recovery time, test stability, or developer complexity.
4. **Describe the design.** Explain affected boundaries, data flow, compatibility impact, and why this option is better than smaller alternatives.
5. **Prototype safely.** Work in a fork, branch, mock environment, isolated Supabase project, or other development-only environment.
6. **Benchmark before/after.** Use reproducible test data and publish the method, baseline, result, and known limitations.
7. **Plan migration and rollback.** Every breaking or stateful core change must explain how ZLife moves forward and how maintainers revert safely.
8. **Security/data review.** Call out authentication, authorization, tenancy, privacy, secrets, external-provider, billing, and data-retention implications.
9. **Compatibility review.** Identify modules, APIs, schemas, workers, clients, tests, and deployment assumptions that could break.
10. **Release in stages.** Large core changes should be mergeable behind flags/adapters or otherwise support gradual adoption where practical.
11. **Measure after release.** The proposal is not considered successful because code merged; maintainers compare actual results with the stated targets and may keep, revise, or roll back the design.

## Required evidence for a core redesign PR

A core redesign PR should include or link to:

- the approved/progressing Core Architecture Proposal issue;
- affected system boundaries;
- before/after benchmark method and results;
- CI/test coverage for old and new behavior;
- migration steps;
- rollback steps;
- security and privacy impact;
- compatibility risks;
- cost impact where relevant;
- observability/health signals used to know whether the change is working;
- a staged deployment or feature-flag plan when the change is high risk.

## Stability rules

Performance improvements are not accepted if they reduce correctness, tenant isolation, security, recoverability, auditability, or test confidence without an explicit reviewed tradeoff.

Large rewrites must not remove the stable path until the replacement proves itself. Prefer adapters, flags, dual-read/dual-write windows, shadow evaluation, staged migrations, or other reversible techniques when practical.

A benchmark must not use production customer data or secrets. Synthetic/fake datasets are the default.

## Approval boundary

Outside members can design and build core changes, but cannot directly promote them to production. Maintainers retain final merge/release authority and may require additional review for database, auth, security, billing, deployment, or cross-module changes.

Broad outside core contribution should not be treated as fully launched until `main` is protected with required PR/check rules. See issue #93.

## How value is recognized

Core architecture contributions can earn verified contribution value when the work is accepted and its usefulness is demonstrated. Value should reflect measurable impact, quality, reliability, difficulty, maintenance value, and ongoing usefulness—not lines of code or size of rewrite.

A large redesign that produces no measurable benefit should not outrank a smaller change that materially improves ZLife.
