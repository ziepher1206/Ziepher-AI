import { GoogleGenAI } from "@google/genai";

export async function planWithGemini(prompt: string) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured.");

  const model =
    process.env.GOOGLE_PLANNING_MODEL ?? "gemini-3.1-flash-lite";
  const client = new GoogleGenAI({ apiKey });
  const interaction = await client.interactions.create({
    model,
    input: prompt,
    store: false
  });

  const text = interaction.output_text;
  if (!text) throw new Error("Gemini returned an empty planning response.");

  return { text, model };
}
