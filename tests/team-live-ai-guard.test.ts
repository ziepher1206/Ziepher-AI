import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("live ZLife specialist team safeguards", () => {
  it("requires explicit confirmation, operator enablement, and spend guard", () => {
    const route = read("app/api/team/runs/route.ts");
    expect(route).toContain('body?.confirmPaidAI !== true');
    expect(route).toContain('SITE_REFINER_PAID_AI_ENABLED !== "true"');
    expect(route).toContain("liveAgentExecutionEnabled()");
    expect(route).toContain("assertAIProviderBudget(existingMonthlySpendUsd + providerCostUsd)");
  });

  it("records measured token usage and provider cost for live specialist calls", () => {
    const route = read("app/api/team/runs/route.ts");
    expect(route).toContain('operation: `agent_review:${agent.id}`');
    expect(route).toContain("input_tokens: usage.inputTokens");
    expect(route).toContain("output_tokens: usage.outputTokens");
    expect(route).toContain("provider_cost_usd: usage.providerCostUsd");
    expect(route).toContain("billable_to_user: false");
  });
});
