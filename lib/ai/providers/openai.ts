import OpenAI from "openai";
import { assertZLifeLiveProviderAllowed } from "../../community/provider-adapters";
import { openAIUsageFromResponse } from "../usage";

export async function planWithOpenAI(prompt: string) {
  assertZLifeLiveProviderAllowed("ai");

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_PLANNING_MODEL;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  if (!model) throw new Error("OPENAI_PLANNING_MODEL is not configured.");

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "Return valid JSON only. Follow the supplied application-planning schema exactly."
      },
      { role: "user", content: prompt }
    ]
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty planning response.");
  }

  return {
    text: response.output_text,
    model,
    usage: openAIUsageFromResponse(model, response.usage)
  };
}
