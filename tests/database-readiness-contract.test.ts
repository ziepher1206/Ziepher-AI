import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LAUNCH_CRITICAL_RELATIONS } from "../lib/db/readiness-contract";

const relationNames = LAUNCH_CRITICAL_RELATIONS.map((relation) => relation.name);

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("launch-critical database readiness contract", () => {
  it("covers the Tree Service lifecycle and automation queue", () => {
    expect(relationNames).toEqual(expect.arrayContaining([
      "customers",
      "properties",
      "leads",
      "estimates",
      "appointments",
      "crews",
      "jobs",
      "invoices",
      "payment_transactions",
      "operate_review_requests",
      "operate_automation_policies",
      "operate_automation_events",
    ]));
  });

  it("covers Proof of Value relations required by the public value page", () => {
    expect(relationNames).toEqual(expect.arrayContaining([
      "community_contributors",
      "value_assets",
      "value_asset_contribution_events",
      "value_lineage_edges",
      "value_measurements",
      "value_policy_versions",
      "value_reward_simulations",
      "value_reward_simulation_allocations",
      "value_verified_effective_shares",
    ]));
  });

  it("provides an explicit environment-backed readiness command without adding it to secretless CI", () => {
    const pkg = JSON.parse(source("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["check:db-readiness"]).toBe("tsx scripts/check-database-readiness.ts");
    expect(pkg.scripts.check).not.toContain("check:db-readiness");
    expect(pkg.scripts["check:full"]).not.toContain("check:db-readiness");
  });

  it("fails closed when required Supabase credentials or relations are unavailable", () => {
    const script = source("scripts/check-database-readiness.ts");
    expect(script).toContain("Missing required environment variable");
    expect(script).toContain("failures.push");
    expect(script).toContain("process.exitCode = 1");
  });
});
