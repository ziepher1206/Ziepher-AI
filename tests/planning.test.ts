import { describe, expect, it } from "vitest";
import { createDeterministicPlan } from "../lib/ai/deterministic-plan";

describe("deterministic planning", () => {
  it("keeps financial integrations last", () => {
    const plan = createDeterministicPlan(
      "Build a booking platform with customer accounts and payments."
    );

    expect(plan.integrationOrder.at(-1)?.toLowerCase()).toContain("money");
    expect(plan.buildPhases[0]?.billable).toBe(false);
    expect(plan.visualDirections.length).toBeGreaterThanOrEqual(4);
  });
});
