import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("SiteRefiner AI usage persistence", () => {
  it("records provider token usage and provider cost for approved AI planning", () => {
    const route = read(
      "app/api/projects/[projectId]/change-requests/[requestId]/generate/route.ts"
    );

    expect(route).toContain('.from("model_usage").insert({');
    expect(route).toContain('operation: "site_change_planning"');
    expect(route).toContain("input_tokens: result.usage.inputTokens");
    expect(route).toContain("output_tokens: result.usage.outputTokens");
    expect(route).toContain("cached_input_tokens: result.usage.cachedInputTokens");
    expect(route).toContain("provider_cost_usd: result.usage.providerCostUsd");
    expect(route).toContain("billable_to_user: false");
    expect(route).toContain("customer_usage_usd: 0");
  });
});
