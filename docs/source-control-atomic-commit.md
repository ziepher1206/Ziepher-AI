# Atomic source publication

Ziepher source-control publication is intentionally split from paid AI generation.

For a `branch_created` source-control run, the worker:

1. Claims the run with an expiring service-only lease.
2. Downloads the published `source_archive` artifact from Supabase Storage.
3. Verifies the archive bytes against the artifact SHA-256 stored in Postgres.
4. Validates archive paths and extracted generated files before any GitHub write.
5. Creates Git blobs, one tree based on the recorded branch parent, and one Git commit.
6. Fast-forwards only the isolated `ziepher/...` working branch with `force: false`.
7. Records the resulting commit SHA and transitions `branch_created -> changes_ready` using the same lease/revision compare-and-swap guard.

Retry reconciliation is fail-closed. If the branch already advanced, Ziepher accepts it only when it is exactly one commit ahead of the recorded parent and its deterministic commit message contains the exact source-control run ID, build-job ID, and source archive SHA-256. Any unrelated branch movement blocks the run instead of overwriting repository state.

This stage does not open or merge a pull request, deploy production, or call an AI provider.
