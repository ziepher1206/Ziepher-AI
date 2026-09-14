import { describe, expect, it } from "vitest";
import { openAIMaxOutputTokens } from "../lib/ai/provider-limits";

describe("OpenAI output limits", () => {
  it("fails closed when an operation limit is missing", () => {
    expect(() => openAIMaxOutputTokens("planning", {})).toThrow(
      "OPENAI_PLANNING_MAX_OUTPUT_TOKENS"
    );
  });

  it("accepts explicit bounded limits", () => {
    expect(
      openAIMaxOutputTokens("agent", {
        OPENAI_AGENT_MAX_OUTPUT_TOKENS: "4000"
      })
    ).toBe(4000);
  });

  it("rejects excessive limits", () => {
    expect(() =>
      openAIMaxOutputTokens("build", {
        OPENAI_BUILD_MAX_OUTPUT_TOKENS: "100000"
      })
    ).toThrow("OPENAI_BUILD_MAX_OUTPUT_TOKENS");
  });
});
