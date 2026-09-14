import OpenAI from "openai";
import { assertZLifeLiveProviderAllowed } from "../../community/provider-adapters";

export async function buildWithOpenAI(prompt: string, model: string) {
  assertZLifeLiveProviderAllowed("ai");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "Return one valid JSON object only. Generate secure, maintainable application source files."
      },
      { role: "user", content: prompt }
    ]
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty build response.");
  }

  return { text: response.output_text, model };
}
