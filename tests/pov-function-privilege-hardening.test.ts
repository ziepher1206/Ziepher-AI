import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260914221400_pov_function_privilege_hardening.sql",
  "utf8",
);

describe("Proof of Value function privilege hardening", () => {
  it("removes PUBLIC, anon, and authenticated execution from internal integrity functions", () => {
    for (const signature of [
      "value_integrity_multiplier(uuid, uuid)",
      "scan_value_share_anomalies(interval)",
      "scan_value_measurement_anomalies(numeric)",
      "scan_value_reviewer_conflicts()",
      "prevent_verified_lineage_cycle()",
    ]) {
      expect(migration).toContain(`revoke all on function public.${signature}`);
    }

    expect(migration.match(/from public, anon, authenticated;/g)?.length).toBe(5);
  });

  it("keeps server-side integrity scanners available to service_role", () => {
    expect(migration).toContain(
      "grant execute on function public.value_integrity_multiplier(uuid, uuid) to service_role;",
    );
    expect(migration).toContain(
      "grant execute on function public.scan_value_share_anomalies(interval) to service_role;",
    );
    expect(migration).toContain(
      "grant execute on function public.scan_value_measurement_anomalies(numeric) to service_role;",
    );
    expect(migration).toContain(
      "grant execute on function public.scan_value_reviewer_conflicts() to service_role;",
    );
  });

  it("pins search_path on every PoV scoring helper flagged by the advisor", () => {
    for (const signature of [
      "value_effective_share(numeric, text, timestamptz, jsonb, timestamptz)",
      "value_metric_score(text, numeric, numeric, jsonb)",
      "value_asset_direct_score(uuid, jsonb, timestamptz)",
      "value_asset_lineage_score(uuid, jsonb, timestamptz)",
      "value_contributor_asset_score(uuid, uuid, jsonb, timestamptz)",
    ]) {
      expect(migration).toContain(`alter function public.${signature}`);
    }

    expect(migration.match(/set search_path = public, pg_temp;/g)?.length).toBe(5);
  });
});
