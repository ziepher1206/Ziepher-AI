# Supabase privileged RPC security contract

This document records the expected access boundary for ZLife's Supabase `SECURITY DEFINER` functions. It is a security contract, not a replacement for RLS or application authorization.

## Default rule

A `SECURITY DEFINER` function can execute with privileges beyond the caller's row-level permissions. Therefore:

- `anon` must not receive direct `EXECUTE` permission on privileged RPC functions.
- `PUBLIC` must not retain default `EXECUTE` permission on privileged RPC functions.
- Worker, payment-settlement, deployment, source-control-worker, credit-administration, trigger, and other internal functions must not be callable by `authenticated` browser sessions unless an explicit product requirement and authorization design exists.
- `service_role` access is reserved for trusted server/worker code and must never be exposed to browser code or community forks.
- Authenticated client RPCs must perform their own user/workspace/project authorization before privileged data access or mutation.
- Community Contribution Ledger tables remain server/maintainer controlled until a reviewed public transparency API is introduced.

## Verified production state — 2026-09-14

A read-only audit of the active Ziepher AI Supabase project verified:

- No audited `SECURITY DEFINER` function is directly executable by `anon`.
- Internal worker/payment/source-control privileged functions are not executable by `authenticated` and remain available to trusted `service_role` code.
- Authenticated privileged RPCs are limited to intentional application functions such as project/workspace membership helpers, project planning/build flows, sync/bridge functions, repository binding, deployment requests, and lead-intake-token administration.
- Those authenticated RPC definitions currently contain explicit authentication, membership, ownership, admin-role, object-scope, or equivalent authorization checks appropriate to their operation.

Supabase's security advisor can still warn when an authenticated role is allowed to call a `SECURITY DEFINER` function. That warning must be triaged function-by-function; it is not safe to silence it by blindly changing all functions to `SECURITY INVOKER` or removing required client access.

## Review checklist for any new privileged RPC

Before merging a new or changed `SECURITY DEFINER` function:

1. Explain why elevated privileges are required instead of ordinary RLS + `SECURITY INVOKER` behavior.
2. Set a controlled `search_path`.
3. Revoke default execution from `PUBLIC` and `anon` unless the function is deliberately designed as a public capability behind a separate trusted server boundary.
4. Grant `authenticated` only when browser/session clients genuinely need the RPC.
5. If `authenticated` is granted, validate `auth.uid()` and the exact workspace/project/object authorization inside the function.
6. For internal functions, revoke browser-role execution and grant only the trusted role that calls it.
7. Never authorize from user-editable metadata.
8. Add or update tests/documentation for the intended caller and authorization boundary.
9. Run Supabase security advisors after DDL changes and investigate new findings.
10. Verify no service-role credential or production secret is exposed to client code, logs, PRs, forks, or development fixtures.

## Community boundary

Outside contributors build with their own Supabase projects and fake development data. They do not receive Ziepher Tech production database credentials. Migrations can be reviewed through Pull Requests, but production application of migrations remains a maintainer-controlled release action.

## Repository protection dependency

The code-review side of this contract depends on protecting `main` so critical Supabase and security changes cannot bypass Pull Requests and CI. Repository issue #93 tracks that administration-level control.
