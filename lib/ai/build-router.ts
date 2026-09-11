import type { AppPlan } from "./types";
import { buildArtifactSchema, type BuildArtifact } from "./build-types";
import { createBuildPrompt, createRepairPrompt } from "./build-prompts";
import { createDeterministicBuild } from "./deterministic-build";
import { buildWithGemini } from "./providers/gemini-build";
import { buildWithOpenAI } from "./providers/openai-build";
import { parseJsonObject } from "./json";
import { paidAIProviderOrder } from "./provider-policy";
import type { QualityMode } from "@/lib/domain/schemas";

export type BuildRouteResult = {
  artifact: BuildArtifact;
  provider: "gemini" | "openai" | "deterministic";
  model: string;
};

function googleModelFor(mode: QualityMode) {
  if (mode === "best") {
    return (
      process.env.GOOGLE_ESCALATION_MODEL ??
      process.env.GOOGLE_BUILD_MODEL ??
      "gemini-3.5-flash"
    );
  }
  return process.env.GOOGLE_BUILD_MODEL ?? "gemini-3.5-flash";
}

function openAIModelFor(mode: QualityMode) {
  if (mode === "best") {
    return process.env.OPENAI_ESCALATION_MODEL ?? process.env.OPENAI_BUILD_MODEL;
  }
  return process.env.OPENAI_BUILD_MODEL;
}

export async function createApplicationBuild(
  plan: AppPlan,
  visualConceptId: string,
  mode: QualityMode,
  projectContext?: unknown
): Promise<BuildRouteResult> {
  const prompt = createBuildPrompt(plan, visualConceptId, projectContext);

  for (const provider of paidAIProviderOrder()) {
    if (provider === "openai") {
      const model = openAIModelFor(mode);
      if (!process.env.OPENAI_API_KEY || !model) continue;
      try {
        const result = await buildWithOpenAI(prompt, model);
        return {
          artifact: buildArtifactSchema.parse(parseJsonObject(result.text)),
          provider: "openai",
          model
        };
      } catch (error) {
        console.error("OpenAI build route failed:", error);
      }
      continue;
    }

    if (!process.env.GOOGLE_AI_API_KEY) continue;
    const model = googleModelFor(mode);
    try {
      const result = await buildWithGemini(prompt, model);
      return {
        artifact: buildArtifactSchema.parse(parseJsonObject(result.text)),
        provider: "gemini",
        model
      };
    } catch (error) {
      console.error("Gemini build route failed:", error);
    }
  }

  return {
    artifact: createDeterministicBuild(plan, visualConceptId),
    provider: "deterministic",
    model: "ziepher-scaffold-v2"
  };
}

export async function repairApplicationBuild(
  plan: AppPlan,
  visualConceptId: string,
  currentArtifact: BuildArtifact,
  failureOutput: string,
  mode: QualityMode,
  projectContext?: unknown
): Promise<BuildRouteResult | null> {
  const prompt = createRepairPrompt(
    plan,
    visualConceptId,
    currentArtifact,
    failureOutput,
    projectContext
  );

  for (const provider of paidAIProviderOrder()) {
    if (provider === "openai") {
      const model = process.env.OPENAI_ESCALATION_MODEL ?? process.env.OPENAI_BUILD_MODEL;
      if (!process.env.OPENAI_API_KEY || !model) continue;
      try {
        const result = await buildWithOpenAI(prompt, model);
        return {
          artifact: buildArtifactSchema.parse(parseJsonObject(result.text)),
          provider: "openai",
          model
        };
      } catch (error) {
        console.error("OpenAI repair route failed:", error);
      }
      continue;
    }

    if (!process.env.GOOGLE_AI_API_KEY) continue;
    const model =
      mode === "economy"
        ? (process.env.GOOGLE_BUILD_MODEL ?? "gemini-3.5-flash")
        : (process.env.GOOGLE_ESCALATION_MODEL ??
          process.env.GOOGLE_BUILD_MODEL ??
          "gemini-3.5-flash");
    try {
      const result = await buildWithGemini(prompt, model);
      return {
        artifact: buildArtifactSchema.parse(parseJsonObject(result.text)),
        provider: "gemini",
        model
      };
    } catch (error) {
      console.error("Gemini repair route failed:", error);
    }
  }

  return null;
}
