import { afterEach, describe, expect, it, vi } from "vitest";

import { createFreePlan } from "../lib/ai/router";
import { executeLiveAgent } from "../lib/agents/execute";
import { planWithOpenAI } from "../lib/ai/providers/openai";
import { getStripe } from "../lib/stripe/server";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ZLife provider routing", () => {
  it("uses deterministic development AI planning without contacting a paid provider", async () => {
    vi.stubEnv("ZLIFE_DEV_MODE", "true");
    vi.stubEnv("ZLIFE_MOCK_AI", "true");
    vi.stubEnv("OPENAI_API_KEY", "would-be-live-key");
    vi.stubEnv("OPENAI_PLANNING_MODEL", "would-be-live-model");

    const result = await createFreePlan(
      "Build a simple tree-service scheduling and estimate workflow for development testing.",
    );

    expect(result.provider).toBe("mock");
    expect(result.model).toBe("zlife-development-mock-ai-v1");
    expect(result.developmentData).toBe(true);
    expect(result.estimatedProviderCostUsd).toBe(0);
  });

  it("runs a deterministic development agent response without enabling live agents", async () => {
    vi.stubEnv("ZLIFE_DEV_MODE", "true");
    vi.stubEnv("ZLIFE_MOCK_AI", "true");
    vi.stubEnv("ZIEPHER_AGENT_LIVE_ENABLED", "false");
    vi.stubEnv("OPENAI_API_KEY", "would-be-live-key");

    const result = await executeLiveAgent({
      agentId: "atlas",
      projectBrief: "Review the development architecture for a tree-service module.",
    });

    expect(result.mode).toBe("mock");
    expect(result.developmentData).toBe(true);
    expect(result.output).toContain("NO EXTERNAL AI REQUEST SENT");
  });

  it("blocks direct OpenAI calls at the low-level provider boundary", async () => {
    vi.stubEnv("ZLIFE_DEV_MODE", "true");
    vi.stubEnv("ZLIFE_MOCK_AI", "true");
    vi.stubEnv("OPENAI_API_KEY", "would-be-live-key");
    vi.stubEnv("OPENAI_PLANNING_MODEL", "would-be-live-model");

    await expect(planWithOpenAI("do not send this")).rejects.toThrow(
      "blocked by ZLife development mock mode",
    );
  });

  it("blocks Stripe client creation while payment mocks are active", () => {
    vi.stubEnv("ZLIFE_DEV_MODE", "true");
    vi.stubEnv("ZLIFE_MOCK_PAYMENTS", "true");
    vi.stubEnv("STRIPE_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_would_be_live");

    expect(() => getStripe()).toThrow(
      "blocked by ZLife development mock mode",
    );
  });
});
