# SECURITY DEFINER audit

Last live audit: 2026-09-14

## Result

The live Supabase security advisor currently flags 16 functions because the `authenticated` role can execute `SECURITY DEFINER` functions. The warning is valid as a review requirement, but the deployed ACLs are already fail-closed to browser-anonymous access: all 16 functions are executable by `authenticated` and `service_role`, with `PUBLIC`/`anon` execution revoked.

Do not bulk-convert or bulk-revoke these functions. Several are intentional authenticated application RPCs whose bodies enforce ownership, workspace membership, or owner/admin authorization.

## Live functions reviewed

| Function | Current authorization boundary | Audit disposition |
| --- | --- | --- |
| `apply_project_sync_patch` | authenticated user + project membership | keep; tighten search path in a future tested migration |
| `approve_project_spec` | project membership | product-role review still warranted |
| `create_operate_lead_intake_token` | authenticated + workspace owner/admin | keep |
| `create_project_with_workspace` | authenticated user | keep |
| `ensure_personal_workspace` | authenticated user | keep |
| `get_project_sync_state` | project membership | keep |
| `is_project_member` | caller identity via `auth.uid()` | keep RLS helper |
| `is_workspace_member` | caller identity via `auth.uid()` | keep RLS helper |
| `queue_build_job` | project membership | product-role review still warranted |
| `register_project_bridge_device` | authenticated + project membership | keep |
| `request_project_deployment` | project membership; production additionally owner/workspace owner-admin | keep |
| `restore_project_version` | project membership | product-role review still warranted |
| `revoke_operate_lead_intake_token` | authenticated + workspace owner/admin | keep |
| `save_project_plan` | project membership | keep |
| `select_visual_concept` | project membership | keep |
| `set_project_repository_binding` | project owner or workspace owner/admin | keep |

## Verified deployed ACL shape

The live database was inspected through `pg_proc` and `pg_namespace`. Every function above currently has an ACL equivalent to:

```text
postgres=EXECUTE
service_role=EXECUTE
authenticated=EXECUTE
```

There is no `PUBLIC` or `anon` EXECUTE grant on these 16 functions.

## Source-of-truth finding

Production contains applied security migrations that were not preserved as executable migration files in this repository. Two authorization-critical examples were recovered from the production migration ledger and archived under:

```text
supabase/applied-history/20260911_security_definer_authorization.sql
```

That archive is historical evidence only. It must not be executed as a new migration. The repository also contains older migration filenames whose numeric/local names do not match the timestamp versions stored in the live migration ledger, so normalizing migration history must be planned separately rather than renaming or replaying files in place.

## Remaining safe hardening work

1. Preserve missing applied migration SQL in a non-executable historical archive before changing those functions.
2. Add regression tests for the authorization-critical RPC source we can verify in GitHub.
3. For a future database migration, evaluate pinning each `SECURITY DEFINER` function to an empty or otherwise minimal `search_path` with fully qualified object references. Do this function-by-function with tests; do not bulk-edit production functions.
4. Review whether ordinary project members should be allowed to approve specs, queue builds, and restore versions. That is a product authorization decision, not a mechanical security fix.
5. Keep worker-only `SECURITY DEFINER` functions restricted to `service_role` and never grant them to browser roles.

## Guardrail for future schema work

For new schema changes, commit the migration to GitHub before applying it to Supabase. If an emergency production migration must be applied first, archive its exact SQL and production migration version in GitHub immediately afterward so the repository does not lose the deployed authorization model.
