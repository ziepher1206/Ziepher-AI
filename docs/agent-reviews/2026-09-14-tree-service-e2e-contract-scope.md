# Tree Service end-to-end contract scope — 2026-09-14

This audit branch adds non-mutating regression coverage for the first commercial Tree Service workflow across the repository's effective migration order.

Covered handoffs:

1. public lead intake token, Origin, idempotency, input bounds, rate limiting, and source/consent attribution;
2. server-only public intake RPC execution;
3. authenticated lead conversion with normalized customer/property reuse and transaction-level deduplication locking;
4. service travel/preparation/cleanup buffers and scheduling blocks for estimate appointments;
5. estimate acceptance with job reuse and customer/property/lead/service/estimate lineage;
6. job scheduling with workspace/crew/user authorization, buffers, overrides, crew working hours, and appointment reuse;
7. job completion with completion evidence, retry-safe invoice reuse, estimate/change-order carryover, and invoice lineage;
8. invoice/payment workspace constraints, server-mediated provider writes, authoritative amount verification, repeat settlement behavior, cancellation, refund bounds, and invoice-state recomputation.

Separate existing Phase 6/7 tests cover growth/review surfaces and Assistant prioritization, so this branch does not duplicate those suites.

This is contract/regression coverage, not a claim that the production launch checklist is complete. A controlled executable end-to-end test against a dedicated non-production database remains required before production customer launch.
