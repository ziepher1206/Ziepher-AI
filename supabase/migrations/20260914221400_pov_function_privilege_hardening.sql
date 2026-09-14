-- Harden Proof of Value helper and integrity functions after production advisor review.
-- These functions are internal/server-side. Do not expose them through PostgREST roles.

-- Pin search_path on scoring helpers so object resolution cannot be influenced by role state.
alter function public.value_effective_share(numeric, text, timestamptz, jsonb, timestamptz)
  set search_path = public, pg_temp;
alter function public.value_metric_score(text, numeric, numeric, jsonb)
  set search_path = public, pg_temp;
alter function public.value_asset_direct_score(uuid, jsonb, timestamptz)
  set search_path = public, pg_temp;
alter function public.value_asset_lineage_score(uuid, jsonb, timestamptz)
  set search_path = public, pg_temp;
alter function public.value_contributor_asset_score(uuid, uuid, jsonb, timestamptz)
  set search_path = public, pg_temp;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Earlier PoV migrations
-- revoked anon/authenticated explicitly but did not remove the inherited PUBLIC grant.
-- Remove that inherited path and keep integrity operations server-only.
revoke all on function public.value_integrity_multiplier(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.scan_value_share_anomalies(interval)
  from public, anon, authenticated;
revoke all on function public.scan_value_measurement_anomalies(numeric)
  from public, anon, authenticated;
revoke all on function public.scan_value_reviewer_conflicts()
  from public, anon, authenticated;
revoke all on function public.prevent_verified_lineage_cycle()
  from public, anon, authenticated;

-- Service-role workers may invoke the integrity scanners/multiplier deliberately.
grant execute on function public.value_integrity_multiplier(uuid, uuid) to service_role;
grant execute on function public.scan_value_share_anomalies(interval) to service_role;
grant execute on function public.scan_value_measurement_anomalies(numeric) to service_role;
grant execute on function public.scan_value_reviewer_conflicts() to service_role;

comment on function public.value_integrity_multiplier(uuid, uuid) is
  'Server-only simulation confidence helper. Browser roles must not execute it directly.';
comment on function public.scan_value_share_anomalies(interval) is
  'Server-only Proof of Value integrity scanner.';
comment on function public.scan_value_measurement_anomalies(numeric) is
  'Server-only Proof of Value measurement integrity scanner.';
comment on function public.scan_value_reviewer_conflicts() is
  'Server-only Proof of Value reviewer-conflict scanner.';
comment on function public.prevent_verified_lineage_cycle() is
  'Trigger-only guard preventing direct verified lineage cycles; not callable by browser roles.';
