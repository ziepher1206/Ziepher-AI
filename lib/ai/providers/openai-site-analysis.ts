import OpenAI from "openai";
import type { WebsiteHealth } from "@/lib/site-scan";
import { assertZLifeLiveProviderAllowed } from "@/lib/community/provider-adapters";
import { parseJsonObject } from "../json";
import { openAIMaxOutputTokens } from "../provider-limits";
import { siteAnalysisSchema } from "../site-analysis";
import { openAIUsageFromResponse } from "../usage";

export async function analyzeSiteWithOpenAI(input: {
  businessName: string;
  domain: string;
  health: WebsiteHealth;
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
          "You are ZLife's website improvement analyst. Return one valid JSON object only. Do not invent facts about the business or website. Base conclusions only on the supplied scan evidence. Prioritize safe, measurable improvements and never claim that a change was published."
      },
      {
        role: "user",
        content: [
          `Business: ${input.businessName}`,
          `Domain: ${input.domain}`,
          "Analyze this website scan for SEO, accessibility, conversion, content, technical quality, and trust opportunities.",
          "Required JSON shape: {summary:string,strengths:string[],risks:string[],priorities:{title:string,reason:string,impact:'high'|'medium'|'low',category:'seo'|'accessibility'|'conversion'|'content'|'technical'|'trust',recommendedChange:string}[],questions:string[]}",
          JSON.stringify(input.health)
        ].join("\n\n")
      }
    ]
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty site analysis response.");
  }

  return {
    analysis: siteAnalysisSchema.parse(parseJsonObject(response.output_text)),
    provider: "openai" as const,
    model,
    usage: openAIUsageFromResponse(model, response.usage)
  };
}
