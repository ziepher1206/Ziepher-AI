import { describe, expect, it } from "vitest";
import {
  estimateOpenAIProviderCostUsd,
  openAIUsageFromResponse
} from "@/lib/ai/usage";

describe("OpenAI usage cost metering", () => {
  it("prices Luna usage including cached input", () => {
    const usage = openAIUsageFromResponse("gpt-5.6-luna", {
      input_tokens: 10_000,
      output_tokens: 2_000,
      input_tokens_details: { cached_tokens: 4_000 }
    });

    expect(usage).toEqual({
      inputTokens: 10_000,
      outputTokens: 2_000,
      cachedInputTokens: 4_000,
      providerCostUsd: 0.00368,
      pricingKnown: true
    });
  });

  it("prices Terra and Sol at their configured token rates", () => {
    expect(
      estimateOpenAIProviderCostUsd("gpt-5.6-terra", 1_000_000, 1_000_000)
        .costUsd
    ).toBe(14);
    expect(
      estimateOpenAIProviderCostUsd("gpt-5.6-sol", 1_000_000, 1_000_000)
        .costUsd
    ).toBe(24);
  });

  it("applies GPT-5.6 long-context multipliers above 272K input tokens", () => {
    const result = estimateOpenAIProviderCostUsd(
      "gpt-5.6-luna",
      300_000,
      100_000
    );
    expect(result.pricingKnown).toBe(true);
    expect(result.costUsd).toBe(0.3);
  });

  it("does not fabricate a price for unknown models", () => {
    expect(estimateOpenAIProviderCostUsd("future-model", 1000, 1000)).toEqual({
      costUsd: 0,
      pricingKnown: false
    });
  });
});
