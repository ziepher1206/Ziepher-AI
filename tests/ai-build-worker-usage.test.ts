import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("AI build worker usage accounting", () => {
  it("persists measured provider usage for generation and repair attempts", () => {
    const worker = read("scripts/build-worker.ts");

    expect(worker).toContain('"application_build_generate"');
    expect(worker).toContain("application_build_repair:");
    expect(worker).toContain("input_tokens: result.usage.inputTokens");
    expect(worker).toContain("output_tokens: result.usage.outputTokens");
    expect(worker).toContain("cached_input_tokens: result.usage.cachedInputTokens");
    expect(worker).toContain("provider_cost_usd: result.usage.providerCostUsd");
  });

  it("keeps build AI usage non-billable and carries measured cost into build experience", () => {
    const worker = read("scripts/build-worker.ts");

    expect(worker).toContain("billable_to_user: false");
    expect(worker).toContain("customer_usage_usd: 0");
    expect(worker).toContain("provider_cost_usd: totalProviderCostUsd");
  });
});
