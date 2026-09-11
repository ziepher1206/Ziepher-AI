import { describe, expect, it } from "vitest";
import { paidAIProviderOrder, primaryAIProvider } from "../lib/ai/provider-policy";

function env(values: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...values };
}

describe("AI provider policy", () => {
  it("prefers OpenAI when both paid providers are configured and no override exists", () => {
    const testEnv = env({
      OPENAI_API_KEY: "openai-key",
      GOOGLE_AI_API_KEY: "google-key"
    });

    expect(primaryAIProvider(testEnv)).toBe("openai");
    expect(paidAIProviderOrder(testEnv)).toEqual(["openai"]);
  });

  it("honors an explicit Gemini primary provider", () => {
    const testEnv = env({
      ZIEPHER_AI_PRIMARY_PROVIDER: "gemini",
      OPENAI_API_KEY: "openai-key",
      GOOGLE_AI_API_KEY: "google-key"
    });

    expect(primaryAIProvider(testEnv)).toBe("gemini");
    expect(paidAIProviderOrder(testEnv)).toEqual(["gemini"]);
  });

  it("uses a second paid provider only when paid fallback is explicitly enabled", () => {
    const testEnv = env({
      ZIEPHER_AI_PRIMARY_PROVIDER: "openai",
      ZIEPHER_AI_ALLOW_PAID_FALLBACK: "true",
      OPENAI_API_KEY: "openai-key",
      GOOGLE_AI_API_KEY: "google-key"
    });

    expect(paidAIProviderOrder(testEnv)).toEqual(["openai", "gemini"]);
  });

  it("keeps deterministic mode free even when paid keys exist", () => {
    const testEnv = env({
      ZIEPHER_AI_PRIMARY_PROVIDER: "deterministic",
      ZIEPHER_AI_ALLOW_PAID_FALLBACK: "true",
      OPENAI_API_KEY: "openai-key",
      GOOGLE_AI_API_KEY: "google-key"
    });

    expect(primaryAIProvider(testEnv)).toBe("deterministic");
    expect(paidAIProviderOrder(testEnv)).toEqual([]);
  });

  it("fails closed on an unknown primary provider", () => {
    expect(() =>
      primaryAIProvider(env({ ZIEPHER_AI_PRIMARY_PROVIDER: "mystery-ai" }))
    ).toThrow(/must be openai, gemini, or deterministic/i);
  });
});
