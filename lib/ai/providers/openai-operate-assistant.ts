import OpenAI from "openai";
import { assertZLifeLiveProviderAllowed } from "@/lib/community/provider-adapters";
import { parseJsonObject } from "../json";
import { assistantExplanationSchema, type AssistantPriority } from "../operate-assistant";
import { openAIMaxOutputTokens } from "../provider-limits";
import { openAIUsageFromResponse } from "../usage";

export async function explainOperatePrioritiesWithOpenAI(input: {
  businessName: string;
  priorities: AssistantPriority[];
}) {
  assertZLifeLiveProviderAllowed("ai");

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_PLANNING_MODEL;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  if (!model) throw new Error("OPENAI_PLANNING_MODEL is not configured.");

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    max_output_tokens: openAIMaxOutputTokens("planning"),
    input: [
      {
        role: "system",
        content:
          "You are the ZLife Business Assistant. Explain and prioritize only the supplied operational facts. Do not invent customer facts, revenue, appointments, deadlines, or outcomes. Do not claim to have contacted anyone, charged anyone, published anything, scheduled anything, or changed production. Return one valid JSON object only."
      },
      {
        role: "user",
        content: [
          `Business: ${input.businessName}`,
          "Explain the following deterministic priority queue in plain language. Recommend the safest order of work while respecting that customer messages, payments, publishing, destructive actions, and production releases still require explicit approval.",
          "Required JSON shape: {summary:string,nextSteps:{title:string,reason:string,urgency:'now'|'today'|'soon'|'monitor'}[],cautions:string[]}",
          JSON.stringify(input.priorities)
        ].join("\n\n")
      }
    ]
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty assistant explanation.");
  }

  return {
    explanation: assistantExplanationSchema.parse(parseJsonObject(response.output_text)),
    provider: "openai" as const,
    model,
    usage: openAIUsageFromResponse(model, response.usage)
  };
}
