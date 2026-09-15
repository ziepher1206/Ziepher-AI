import OpenAI from "openai";
import { assertZLifeLiveProviderAllowed } from "../../community/provider-adapters";
import { openAIMaxOutputTokens } from "../provider-limits";
import { openAIUsageFromResponse } from "../usage";
import type { BuildReferenceImage } from "../build-reference-images";

export async function buildWithOpenAI(
  prompt: string,
  model: string,
  referenceImages: BuildReferenceImage[] = []
) {
  assertZLifeLiveProviderAllowed("ai");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const client = new OpenAI({ apiKey });
  const userContent: OpenAI.Responses.ResponseInputContent[] = [
    { type: "input_text", text: prompt }
  ];

  for (const image of referenceImages) {
    userContent.push({
      type: "input_text",
      text: `Design reference: ${image.name}. Match its layout, hierarchy, composition, density, imagery placement, and styling where compatible with the project requirements.`
    });
    userContent.push({
      type: "input_image",
      image_url: image.url,
      detail: "high"
    });
  }

  const response = await client.responses.create({
    model,
    max_output_tokens: openAIMaxOutputTokens("build"),
    input: [
      {
        role: "system",
        content:
          "Return one valid JSON object only. Generate secure, maintainable application source files. When visual reference images are provided, inspect them directly and preserve their important layout, hierarchy, spacing, density, image placement, visual rhythm, and responsive intent rather than reducing them to a generic template."
      },
      { role: "user", content: userContent }
    ]
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty build response.");
  }

  return {
    text: response.output_text,
    model,
    usage: openAIUsageFromResponse(model, response.usage)
  };
}
