import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("paid AI opt-in boundaries", () => {
  it("keeps public planning on the free deterministic route", () => {
    const route = read("app/api/plan/route.ts");
    expect(route).toContain("createFreePlan(input.idea, input.context)");
    expect(route).not.toContain("allowPaidProviders: true");
  });

  it("requires the owner paid-AI flag before project planning can use providers", () => {
    const route = read("app/api/projects/[projectId]/plan/route.ts");
    expect(route).toContain('process.env.SITE_REFINER_PAID_AI_ENABLED === "true"');
    expect(route).toContain("allowPaidProviders: paidAIEnabled");
    expect(route).toContain("assertAIProviderBudget(spentThisMonth)");
  });

  it("only opts approved SiteRefiner change generation into paid providers", () => {
    const route = read(
      "app/api/projects/[projectId]/change-requests/[requestId]/generate/route.ts"
    );
    expect(route).toContain('SITE_REFINER_PAID_AI_ENABLED !== "true"');
    expect(route).toContain("changeRequest.ai_generation_approved");
    expect(route).toContain("allowPaidProviders: true");
    expect(route).toContain("assertAIProviderBudget(spentThisMonth)");
  });
});
