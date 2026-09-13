# Ziepher — Full 22-Agent Team Review

Date: 2026-09-13
Mode: zero-cost deterministic team test
Scope: current unified Ziepher platform, Tree Service first-launch plan, agent-team architecture, and current repository direction

## Important test note

This review tests the full 22-agent workflow using the saved specialist definitions and the current project source. It does **not** represent 22 separate paid OpenAI model calls. Live paid agent execution remains disabled until an explicit budget/approval policy is enabled.

## Executive team conclusion

The team agrees the product direction is strong enough to continue, but Ziepher should not broaden scope before proving one complete commercial workflow.

**Recommended company priority:** finish and verify the Tree Service operating loop end to end, then use that pilot to validate the platform architecture before expanding industries or adding more autonomous behavior.

The highest-risk gap is not missing features. It is **proof of continuity**: one tenant must be able to move from lead → customer/property → estimate → accepted job → crew schedule → completion → invoice → test payment → review/follow-up without broken lineage, duplicate records, permission leaks, or manual provider-dashboard intervention.

## Priority findings

### P0 — Must prove before production customers

1. Complete an automated and manual end-to-end Tree Service test from lead through paid/test invoice.
2. Verify multi-tenant isolation and RLS across all operational tables and public/customer-facing links.
3. Verify accepted estimates create jobs without retyping or losing customer/property/source attribution.
4. Verify scheduling conflicts, crew assignments, overrides, and job rescheduling behave safely.
5. Verify Stripe test-mode payment, webhook idempotency, cancellation/refund states, and duplicate-charge prevention.
6. Verify backups/restore, production rollback, error monitoring, and exact-SHA release controls.
7. Run a controlled pilot through Family Tree Service or another real test business before general launch.

### P1 — Agent platform work

1. Persist every team run, agent output, handoff, decision, approval, model, token usage, estimated cost, and final disposition in Supabase.
2. Add a per-run cost estimate and hard budget cap before live multi-agent execution.
3. Let Mason/Orchestrator select only the agents needed for a task instead of always paying for all 22.
4. Add explicit approval gates for spending, production release, customer communications, payments, and destructive actions.
5. Add a searchable Team Run history inside `/team` so previous reviews can be reopened and compared.

### P2 — Product clarity and cleanup

1. Finish customer-facing naming convergence on **Ziepher**; legacy SiteRefiner/Ziepher AI labels can remain internally only where needed for compatibility.
2. Keep the first commercial message narrow: "Ziepher for Tree Service Businesses" rather than presenting the full lifetime platform vision to early customers.
3. Preserve the current module architecture: Create, Operate, Grow, Match, Analytics, one assistant, specialist agents behind it.

---

# Individual agent feedback

## 1. Mason — Product Manager

**Verdict:** Continue, but freeze scope around launch proof.

- The launch plan is defined well enough to execute.
- The backlog should be reordered around the single end-to-end customer workflow rather than by module completeness.
- Every launch feature should map to a measurable acceptance criterion.
- Do not add another major module until the first controlled pilot completes lead → payment.

**Top request:** create one release checklist tied directly to the Tree Service launch criteria and make it the authoritative launch backlog.

## 2. Arbor — Tree Service Industry Specialist

**Verdict:** The vertical choice is appropriate; workflow realism matters more than adding features.

- Tree-service owners need fast lead intake, property context, estimate scheduling, crew assignment, hazard/access notes, photos, and invoices with minimal office work.
- Customer/property/job lineage must feel continuous.
- Mobile use in the field is essential.
- Avoid forcing crews or owners to duplicate notes between estimate and job records.

**Top request:** test the workflow with real tree-service scenarios: emergency removal, multi-tree estimate, stump grinding add-on, reschedule, inaccessible property, and weather delay.

## 3. Radar — Research / Competitive Intelligence

**Verdict:** Do not compete on feature count yet.

- Ziepher's advantage should be unified workflow + AI guidance + transparent infrastructure/cost, not trying to clone every incumbent field-service feature.
- Competitive research should focus on what tree-service businesses dislike about current tools: complexity, price, fragmented website/lead/operations workflows, and poor AI integration.

**Top request:** maintain a verified competitor matrix only after the core pilot is functional.

## 4. Atlas — CTO / Chief Architect

**Verdict:** Architecture direction is sound; protect boundaries.

- Keep GitHub as source of truth.
- Keep Ziepher Match behind a module/API boundary until migration is justified.
- Keep legacy code reuse selective; do not merge old schemas wholesale.
- Agent execution must remain capability-scoped and auditable.

**Top request:** formalize one control-plane contract for projects, agents, approvals, provider connections, audit events, and releases.

## 5. Mira — UI / UX Designer

**Verdict:** The product must feel like one simple business workspace, not a collection of developer tools.

- The owner dashboard should answer: what needs my attention today?
- Navigation should emphasize Leads, Estimates, Calendar/Jobs, Invoices, Website, Growth, and Assistant.
- Provider concepts such as GitHub/Vercel/Supabase should stay behind Settings/Connected Rails.
- The `/team` workspace is valuable internally, but customers should normally interact with one Ziepher Assistant rather than manually choosing specialists.

**Top request:** design the complete mobile-first owner journey before adding more settings screens.

## 6. Ledger — Cost / Infrastructure Analyst

**Verdict:** Cost controls must exist before live agent-team mode.

- A 22-agent live run can become unnecessarily expensive.
- Route routine work to the smallest capable agent set.
- Store model/token/cost telemetry per run.
- Add a hard dollar cap and require explicit approval to exceed it.

**Top request:** build cost estimation + per-run budget enforcement before enabling `ZIEPHER_AGENT_LIVE_ENABLED=true`.

## 7. Pulse — Data & Analytics Agent

**Verdict:** Instrument the commercial loop now, not after launch.

Track at minimum:
- signup → completed onboarding
- lead received → contacted
- contacted → estimate scheduled
- estimate scheduled → sent
- sent → accepted
- accepted → job scheduled
- job completed → invoice paid
- source → booked job → revenue
- time-to-first-contact
- time-to-payment

**Top request:** define canonical event names and attribution rules before pilot data arrives.

## 8. Rank — SEO / Growth Agent

**Verdict:** Acquisition should wait for operational proof.

- Strongest early growth asset will be a real, verified Tree Service case study.
- Website/SEO/CRO tooling is strategically useful because Ziepher can connect marketing directly to lead and revenue outcomes.
- Do not advertise claims about savings, conversion, automation, or revenue until verified.

**Top request:** make lead-source attribution survive all the way to revenue before spending on growth.

## 9. Cipher — AI Engineer

**Verdict:** Agent architecture is directionally correct; persistence and evaluation are the next requirements.

- Current specialist definitions establish clear role boundaries.
- Full-team execution should not be the default for every task.
- Agent outputs should be structured, versioned, scored, and traceable.
- Model output must remain untrusted input until validated by the next gate.

**Top request:** create persistent `agent_runs`, `agent_steps`, `agent_outputs`, `agent_approvals`, and usage/cost records with evaluation status.

## 10. Nova — Frontend Engineer

**Verdict:** Focus frontend work on completing the operational loop and simplifying navigation.

- Reuse the existing design system instead of introducing a second visual language for the agent team.
- Ensure the Tree Service workflow is fully usable on small screens.
- Team-run status needs clear states: queued, running, blocked, approval required, completed, failed.

**Top request:** connect `/team` run history and results to persistent server data instead of browser-only/transient state.

## 11. Forge — Backend Engineer

**Verdict:** Business-state transitions need explicit server-side invariants.

- Accepted estimate → job creation should be idempotent.
- Completed job → invoice creation should be idempotent.
- External webhooks must tolerate retries.
- Invalid status transitions must be rejected server-side.

**Top request:** centralize transition rules for lead, estimate, job, invoice, payment, and agent-run state machines.

## 12. Ada — Database Engineer

**Verdict:** Data lineage and tenant isolation are launch-critical.

- Every business-owned table must be workspace-scoped.
- Public estimate/payment tokens must not become tenant bypasses.
- Source attribution should be immutable enough to audit but support documented corrections.
- Agent history should be append-oriented rather than overwriting prior output.

**Top request:** run a formal RLS matrix test across every table and public RPC/API path.

## 13. Bridge — Integration Engineer

**Verdict:** Provider integrations should stay gated and idempotent.

- Stripe remains test-only until the payment checklist passes.
- Outbound email/SMS/social activity requires explicit authorization.
- OAuth/scoped provider connections are preferable to shared global credentials.
- Webhook signature validation and retry behavior must be tested.

**Top request:** produce one integration-readiness checklist per external provider before production activation.

## 14. Echo — Mobile Engineer

**Verdict:** PWA-first remains the correct near-term choice.

- Native app stores are not required for first launch.
- Prioritize field usability, installability, offline/error states, touch targets, and photo workflows.
- Add native distribution only after usage proves a PWA limitation.

**Top request:** run real iPhone/Android field-flow testing on estimate, crew, photo, job-completion, and invoice screens.

## 15. Vector — Performance Engineer

**Verdict:** No evidence currently justifies major optimization work.

- Measure dashboard load, operational queries, public estimate page, and website lead forms.
- Watch N+1 queries and over-fetching as operational history grows.
- Establish performance baselines before optimizing.

**Top request:** add lightweight performance telemetry around the highest-frequency owner workflows.

## 16. Quill — Documentation Agent

**Verdict:** Product documentation is useful but naming/history can become confusing.

- The master source correctly establishes Ziepher as the single product.
- Older SiteRefiner/Ziepher AI naming should be marked internal/legacy consistently.
- Launch criteria and current implementation status should be separated so planned features are never mistaken for shipped features.

**Top request:** maintain a simple `CURRENT-STATE.md` that distinguishes verified live, implemented but gated, in progress, and planned capabilities.

## 17. Scout — QA Engineer

**Verdict:** Release is blocked until the launch workflow has reproducible E2E coverage.

Required test scenarios:
- normal lead → paid invoice
- duplicate lead/customer handling
- rejected estimate
- expired estimate
- rescheduled estimate
- accepted estimate converted twice
- crew scheduling conflict
- paused/rescheduled job
- canceled invoice/payment
- duplicate webhook
- cross-tenant access attempt
- expired/invalid public token

**Top request:** build one deterministic seed business and automated E2E test suite around it.

## 18. Sentinel — Security Engineer

**Verdict:** Security architecture is promising, but launch requires verification rather than policy alone.

- Validate RLS and server authorization independently.
- Confirm service-role and provider secrets never reach client bundles.
- Rate-limit/public-form abuse controls need review.
- Agent tool permissions should be granted per task, not inherited permanently.

**Top request:** complete a structured pre-launch security review with explicit evidence for each trust boundary.

## 19. Judge — Independent Code Reviewer

**Verdict:** No architectural rejection, but future PRs should tie changes to acceptance criteria.

- The recent agent-team implementation used a safe branch/PR/CI flow.
- Independent review should be required for migrations, auth/RLS, billing, provider integrations, and release-control changes.
- Generated code should never self-approve.

**Top request:** require a review checklist on high-risk PRs covering tests, rollback, security, data migration, cost, and customer impact.

## 20. Relay — DevOps / Platform Engineer

**Verdict:** Existing GitHub → CI → Vercel flow is appropriate.

- Preserve preview deployments for every meaningful change.
- Production should continue to deploy only reviewed `main` SHAs.
- Add operational monitoring and verify rollback from a real production deployment.

**Top request:** test and document rollback before first customer launch.

## 21. Launch — Release Manager

**Verdict:** Not ready for general commercial release yet; appropriate for controlled development/pilot.

Launch blockers are the documented criteria already in the Tree Service launch plan:
- E2E lead → paid invoice
- tenant isolation
- security/RLS review
- Stripe test suite
- backup/restore
- rollback
- monitoring
- privacy/terms/billing review
- human security review
- controlled pilot completion

**Top request:** do not redefine launch readiness; close these gates one by one.

## 22. Beacon — Support / Triage Agent

**Verdict:** Build support evidence into the product before users arrive.

- Every failed automated action should expose a human-readable reason and correlation/run ID.
- Owners need clear recovery paths when provider connections fail.
- Agent runs should show which step blocked and what approval/action is required.

**Top request:** create a unified activity/error timeline per business/project so support can reproduce problems quickly.

---

# Consolidated recommendation

The team's recommended next build sequence is:

1. **Persistent agent-run ledger and saved feedback UI** — make this test reproducible and inspectable inside Ziepher.
2. **Tree Service E2E test harness** — deterministic seed tenant and automated lead → payment path.
3. **Tenant/RLS security matrix** — prove cross-business isolation.
4. **State-transition/idempotency hardening** — estimate→job, job→invoice, webhook/payment transitions.
5. **Usage/cost instrumentation** — including AI-agent token/cost tracking and run budget caps.
6. **Mobile workflow QA** — owner + crew field scenarios.
7. **Rollback/monitoring verification**.
8. **Controlled real-business pilot**.
9. Only after the above, enable carefully scoped live specialist-agent execution and begin broader market expansion.

## Team vote

- Continue Ziepher: **22/22**
- Keep Tree Service as first launch vertical: **22/22**
- Expand to more industries before first pilot: **0/22**
- Enable unrestricted full 22-agent paid runs now: **0/22**
- Build persistent agent-run history next: **22/22**

## Saved artifact purpose

This file is the first durable full-team review record. Future team reviews should be saved with date, source commit, execution mode, agent outputs, approvals, cost, and resulting actions so Ziepher can compare recommendations over time.