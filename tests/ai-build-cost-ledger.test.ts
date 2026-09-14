import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeterministicPlan } from "../lib/ai/deterministic-plan";
import { createApplicationBuild } from "../lib/ai/build-router";

const worker = readFileSync("scripts/build-worker.ts", "utf8");
const router = readFileSync("lib/ai/build-router.ts", "utf8");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("guarded AI build cost ledger", () => {
  it("keeps application builds deterministic unless paid-provider use is explicitly allowed", async () => {
    vi.stubEnv("ZLIFE_DEV_MODE", "false");
    vi.stubEnv("ZLIFE_MOCK_AI", "false");
    vi.stubEnv("OPENAI_API_KEY", "would-be-live-key");
    vi.stubEnv("OPENAI_BUILD_MODEL", "would-be-live-model");

    const plan = createDeterministicPlan(
      "Build a safe tree-service estimate workflow with project cost tracking."
    );
    const result = await createApplicationBuild(
      plan,
      plan.visualDirections[0]!.id,
      "balanced"
    );

    expect(result.provider).toBe("deterministic");
    expect(result.model).toBe("ziepher-scaffold-v2");
  });

  it("requires an explicit paid-build gate and monthly budget checks in the worker", () => {
    expect(worker).toContain('SITE_REFINER_PAID_BUILDS_ENABLED === "true"');
    expect(worker).toContain("assertAIProviderBudget(existingMonthlyAISpendUsd)");
    expect(worker).toContain("existingMonthlyAISpendUsd + totalUsage.providerCostUsd");
    expect(worker).toContain("allowPaidProvider: paidBuildsEnabled");
  });

  it("persists measured generation and repair usage instead of hard-coded zero cost", () => {
    expect(worker).toContain("input_tokens: totalUsage.inputTokens");
    expect(worker).toContain("output_tokens: totalUsage.outputTokens");
    expect(worker).toContain("cached_input_tokens: totalUsage.cachedInputTokens");
    expect(worker).toContain("provider_cost_usd: totalUsage.providerCostUsd");
    expect(worker).toContain("measured_ai_calls: measuredAICalls");
    expect(worker).toContain("repair_count: repairCount");
    expect(worker).not.toContain('operation: "application_build",\n      billable_to_user: true,\n      provider,\n      model,\n      provider_cost_usd: 0');
  });

  it("blocks unmetered paid-provider fallback by default", () => {
    expect(router).toContain("allowUnmeteredProvider?: boolean");
    expect(router).toContain("if (!options.allowUnmeteredProvider) continue;");
  });
});
