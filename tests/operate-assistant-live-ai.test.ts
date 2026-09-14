import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("app/api/operate/assistant/explain/route.ts", "utf8");
const component = readFileSync("components/operate-assistant-ai.tsx", "utf8");
const page = readFileSync("app/operate/assistant/page.tsx", "utf8");
const provider = readFileSync("lib/ai/providers/openai-operate-assistant.ts", "utf8");
const schema = readFileSync("lib/ai/operate-assistant.ts", "utf8");

describe("ZLife Operate Assistant live AI boundaries", () => {
  it("requires explicit one-run paid AI confirmation and owner enablement", () => {
    expect(schema).toContain("confirmPaidAI: z.literal(true)");
    expect(route).toContain('ZLIFE_ASSISTANT_PAID_AI_ENABLED !== "true"');
    expect(component).toContain("!liveAIAvailable || !approved || running");
    expect(component).toContain("confirmPaidAI: true");
    expect(component).toContain("I approve one OpenAI explanation request");
  });

  it("enforces monthly budget and records measured provider usage without customer charging", () => {
    expect(route).toContain("currentUtcMonthStart()");
    expect(route).toContain("assertAIProviderBudget(spentThisMonth)");
    expect(route).toContain('.from("model_usage").insert');
    expect(route).toContain('operation: "operate_assistant_explanation"');
    expect(route).toContain("input_tokens: result.usage.inputTokens");
    expect(route).toContain("output_tokens: result.usage.outputTokens");
    expect(route).toContain("provider_cost_usd: result.usage.providerCostUsd");
    expect(route).toContain("customer_usage_usd: 0");
    expect(route).toContain("billable_to_user: false");
  });

  it("keeps OpenAI output constrained to explanation-only JSON", () => {
    expect(provider).toContain('assertZLifeLiveProviderAllowed("ai")');
    expect(provider).toContain('openAIMaxOutputTokens("planning")');
    expect(provider).toContain("Do not invent customer facts");
    expect(provider).toContain("Do not claim to have contacted anyone");
    expect(provider).toContain("assistantExplanationSchema.parse");
  });

  it("keeps the deterministic priority queue as the operational source of truth", () => {
    expect(page).toContain("Here’s what I would work on next.");
    expect(page).toContain("read-only and deterministic");
    expect(page).toContain("Prepared next actions");
    expect(page).toContain("Customer messages, social publishing, paid ads, production website releases, live Stripe charges");
    expect(page).toContain("<OperateAssistantAI");
  });
});
