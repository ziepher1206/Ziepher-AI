import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Tree Service launch readiness command", () => {
  it("exposes a deterministic zero-cost launch check", () => {
    const packageJson = read("package.json");
    const checker = read("scripts/tree-service-launch-readiness.ts");

    expect(packageJson).toContain('"check:tree-launch": "tsx scripts/tree-service-launch-readiness.ts"');
    expect(checker).toContain("ZLife Tree Service launch readiness");
    expect(checker).toContain("Static checks:");
    expect(checker).toContain("Manual/pilot gates remain mandatory");
    expect(checker).not.toContain("fetch(");
    expect(checker).not.toContain("createAdminClient");
  });

  it("keeps all seven phase suites and critical Operate surfaces in the checker", () => {
    const checker = read("scripts/tree-service-launch-readiness.ts");
    for (const path of [
      "tests/operate-phase1-foundation.test.ts",
      "tests/tree-service-phase2-lead-intake.test.ts",
      "tests/tree-service-phase3-estimates-scheduling.test.ts",
      "tests/tree-service-phase4-jobs-crew.test.ts",
      "tests/operate-phase5-invoices-stripe.test.ts",
      "tests/operate-phase6-growth.test.ts",
      "tests/operate-phase7-assistant.test.ts",
      "app/operate/leads/page.tsx",
      "app/operate/estimates/page.tsx",
      "app/operate/calendar/page.tsx",
      "app/operate/invoices/page.tsx",
      "app/operate/growth/page.tsx",
      "app/operate/assistant/page.tsx",
    ]) expect(checker).toContain(path);
  });

  it("does not let static success erase the real production launch gates", () => {
    const checker = read("scripts/tree-service-launch-readiness.ts");
    for (const phrase of [
      "authenticated end-to-end run",
      "two-user/two-workspace tenant-isolation",
      "actual Stripe test webhooks",
      "backup/restore",
      "production rollback drill",
      "human review of RLS",
      "privacy, terms, billing, refund",
      "controlled tree-service pilot",
    ]) expect(checker).toContain(phrase);
  });
});
