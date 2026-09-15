import type { AppPlan } from "./types";
import { buildArtifactSchema, type BuildArtifact } from "./build-types";
import { createBuildPrompt, createRepairPrompt } from "./build-prompts";
import { createDeterministicBuild } from "./deterministic-build";
import { buildWithGemini } from "./providers/gemini-build";
import { buildWithOpenAI } from "./providers/openai-build";
import { parseJsonObject } from "./json";
import { paidAIProviderOrder } from "./provider-policy";
import type { QualityMode } from "@/lib/domain/schemas";
import { shouldUseZLifeMock } from "../community/dev-mode";
import type { AIUsage } from "./usage";
import {
  loadBuildReferenceImages,
  type BuildReferenceImage
} from "./build-reference-images";
import {
  loadBuildSiteAssets,
  type BuildSiteAsset
} from "./build-site-assets";

export type BuildRouteResult = {
  artifact: BuildArtifact;
  provider: "gemini" | "openai" | "deterministic" | "mock";
  model: string;
  usage?: AIUsage;
  developmentData?: boolean;
};

type BuildRouteOptions = {
  allowPaidProvider?: boolean;
  allowUnmeteredProvider?: boolean;
  referenceImages?: BuildReferenceImage[];
  siteAssets?: BuildSiteAsset[];
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

function createMockBuild(
  plan: AppPlan,
  visualConceptId: string,
): BuildRouteResult {
  return {
    artifact: createDeterministicBuild(plan, visualConceptId),
    provider: "mock",
    model: "zlife-development-mock-ai-v1",
    developmentData: true
  };
}

function createDeterministicBuildResult(
  plan: AppPlan,
  visualConceptId: string
): BuildRouteResult {
  return {
    artifact: createDeterministicBuild(plan, visualConceptId),
    provider: "deterministic",
    model: "ziepher-scaffold-v2"
  };
}

async function referenceImagesForPaidBuild(
  plan: AppPlan,
  options: BuildRouteOptions
) {
  if (options.referenceImages) return options.referenceImages;
  if (!plan.projectId) return [];
  return loadBuildReferenceImages(plan.projectId);
}

async function siteAssetsForBuild(plan: AppPlan, options: BuildRouteOptions) {
  if (options.siteAssets) return options.siteAssets;
  if (!plan.projectId) return [];
  return loadBuildSiteAssets(plan.projectId);
}

export async function createApplicationBuild(
  plan: AppPlan,
  visualConceptId: string,
  mode: QualityMode,
  projectContext?: unknown,
  options: BuildRouteOptions = {}
): Promise<BuildRouteResult> {
  if (shouldUseZLifeMock("ai")) {
    return createMockBuild(plan, visualConceptId);
  }

  if (!options.allowPaidProvider) {
    return createDeterministicBuildResult(plan, visualConceptId);
  }

  const [referenceImages, siteAssets] = await Promise.all([
    referenceImagesForPaidBuild(plan, options),
    siteAssetsForBuild(plan, options)
  ]);
  const prompt = createBuildPrompt(
    plan,
    visualConceptId,
    projectContext,
    siteAssets
  );

  for (const provider of paidAIProviderOrder()) {
    if (provider === "openai") {
      const model = openAIModelFor(mode);
      if (!process.env.OPENAI_API_KEY || !model) continue;
      try {
        const result = await buildWithOpenAI(prompt, model, referenceImages);
        return {
          artifact: buildArtifactSchema.parse(parseJsonObject(result.text)),
          provider: "openai",
          model,
          usage: result.usage
        };
      } catch (error) {
        console.error("OpenAI build route failed:", error);
      }
      continue;
    }

    // A paid provider that does not yet return measurable token/cost telemetry
    // stays blocked by default. This prevents a fallback from consuming credits
    // outside the monthly spend ledger.
    if (!options.allowUnmeteredProvider) continue;
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

  return createDeterministicBuildResult(plan, visualConceptId);
}

export async function repairApplicationBuild(
  plan: AppPlan,
  visualConceptId: string,
  currentArtifact: BuildArtifact,
  failureOutput: string,
  mode: QualityMode,
  projectContext?: unknown,
  options: BuildRouteOptions = {}
): Promise<BuildRouteResult | null> {
  if (shouldUseZLifeMock("ai")) {
    return createMockBuild(plan, visualConceptId);
  }

  if (!options.allowPaidProvider) return null;

  const [referenceImages, siteAssets] = await Promise.all([
    referenceImagesForPaidBuild(plan, options),
    siteAssetsForBuild(plan, options)
  ]);
  const prompt = createRepairPrompt(
    plan,
    visualConceptId,
    currentArtifact,
    failureOutput,
    projectContext,
    siteAssets
  );

  for (const provider of paidAIProviderOrder()) {
    if (provider === "openai") {
      const model = process.env.OPENAI_ESCALATION_MODEL ?? process.env.OPENAI_BUILD_MODEL;
      if (!process.env.OPENAI_API_KEY || !model) continue;
      try {
        const result = await buildWithOpenAI(prompt, model, referenceImages);
        return {
          artifact: buildArtifactSchema.parse(parseJsonObject(result.text)),
          provider: "openai",
          model,
          usage: result.usage
        };
      } catch (error) {
        console.error("OpenAI repair route failed:", error);
      }
      continue;
    }

    if (!options.allowUnmeteredProvider) continue;
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
