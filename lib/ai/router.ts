import { appPlanSchema, type PlanResult } from "./types";
import { createPlanningPrompt } from "./prompts";
import { planWithGemini } from "./providers/gemini";
import { planWithOpenAI } from "./providers/openai";
import { createDeterministicPlan } from "./deterministic-plan";
import { parseJsonObject } from "./json";
import { paidAIProviderOrder } from "./provider-policy";
import { shouldUseZLifeMock } from "../community/dev-mode";

export async function createFreePlan(
  idea: string,
  projectContext?: unknown
): Promise<PlanResult> {
  if (shouldUseZLifeMock("ai")) {
    return {
      plan: createDeterministicPlan(idea),
      provider: "mock",
      model: "zlife-development-mock-ai-v1",
      estimatedProviderCostUsd: 0,
      developmentData: true
    };
  }

  const prompt = createPlanningPrompt(idea, projectContext);

  for (const provider of paidAIProviderOrder()) {
    if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_PLANNING_MODEL) continue;
      try {
        const result = await planWithOpenAI(prompt);
        return {
          plan: appPlanSchema.parse(parseJsonObject(result.text)),
          provider: "openai",
          model: result.model,
          estimatedProviderCostUsd: 0
        };
      } catch (error) {
        console.error("OpenAI planning route failed:", error);
      }
      continue;
    }

    if (!process.env.GOOGLE_AI_API_KEY) continue;
    try {
      const result = await planWithGemini(prompt);
      return {
        plan: appPlanSchema.parse(parseJsonObject(result.text)),
        provider: "gemini",
        model: result.model,
        estimatedProviderCostUsd: 0
      };
    } catch (error) {
      console.error("Gemini planning route failed:", error);
    }
  }

  return {
    plan: createDeterministicPlan(idea),
    provider: "deterministic",
    model: "local-planner-v2",
    estimatedProviderCostUsd: 0
  };
}
