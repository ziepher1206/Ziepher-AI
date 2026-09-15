import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeSiteWithOpenAI } from "@/lib/ai/providers/openai-site-analysis";
import { createDeterministicSiteAnalysis } from "@/lib/ai/site-analysis";
import {
  assertAIProviderBudget,
  currentUtcMonthStart
} from "@/lib/ai/spend-guard";
import { projectIdSchema } from "@/lib/domain/schemas";
import { apiError } from "@/lib/http";
import type { WebsiteHealth } from "@/lib/site-scan";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  mode: z.enum(["deterministic", "live"]).default("deterministic"),
  confirmPaidAI: z.boolean().optional().default(false)
});

type Context = { params: Promise<{ projectId: string }> };

function healthFrom(value: unknown): WebsiteHealth {
  if (!value || typeof value !== "object") {
    throw new Error("Run a website scan before creating a detailed analysis.");
  }
  const health = value as Partial<WebsiteHealth>;
  if (
    typeof health.score !== "number" ||
    !Array.isArray(health.checks) ||
    !Array.isArray(health.recommendations) ||
    typeof health.scannedUrl !== "string"
  ) {
    throw new Error("Run a complete website scan before creating a detailed analysis.");
  }
  return health as WebsiteHealth;
}

export async function POST(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = requestSchema.parse(await request.json().catch(() => ({})));
    const supabase = await createClient();
    const admin = createAdminClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,workspace_id,name,business_name,source_domain,primary_domain,scan_status,website_health")
      .eq("id", projectId)
      .single();
    if (projectError || !project) throw new Error("Website not found.");
    if (project.scan_status !== "complete") {
      throw new Error("Run a successful website scan before creating a detailed analysis.");
    }

    const health = healthFrom(project.website_health);
    const domain = project.primary_domain ?? project.source_domain ?? new URL(health.scannedUrl).hostname;
    const businessName = project.business_name ?? project.name;

    let analysis = createDeterministicSiteAnalysis(health);
    let provider = "deterministic";
    let model = "site-analysis-rules-v1";

    if (input.mode === "live") {
      if (!input.confirmPaidAI) {
        throw new Error("Explicit paid AI confirmation is required for live site analysis.");
      }
      if (process.env.SITE_REFINER_PAID_AI_ENABLED !== "true") {
        throw new Error("Live Z-Life Build AI analysis is disabled by the owner.");
      }

      const { data: costEvents, error: costError } = await admin
        .from("project_cost_events")
        .select("provider_cost_usd")
        .eq("workspace_id", project.workspace_id)
        .eq("category", "ai")
        .gte("created_at", currentUtcMonthStart());
      if (costError) throw costError;
      const spentThisMonth = (costEvents ?? []).reduce(
        (sum, event) => sum + Number(event.provider_cost_usd ?? 0),
        0
      );
      const budget = assertAIProviderBudget(spentThisMonth);

      const result = await analyzeSiteWithOpenAI({ businessName, domain, health });
      analysis = result.analysis;
      provider = result.provider;
      model = result.model;

      const { error: usageError } = await admin.from("model_usage").insert({
        workspace_id: project.workspace_id,
        project_id: projectId,
        operation: "site_deep_analysis",
        billable_to_user: false,
        provider: result.provider,
        model: result.model,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        cached_input_tokens: result.usage.cachedInputTokens,
        provider_cost_usd: result.usage.providerCostUsd,
        customer_usage_usd: 0,
        usage_metadata: {
          source: "site_analysis",
          pricing_known: result.usage.pricingKnown,
          monthly_budget_usd: budget.budgetUsd,
          monthly_spend_before_call_usd: budget.spentUsd
        }
      });
      if (usageError) throw usageError;
    }

    const { data: updated, error: saveError } = await supabase.rpc(
      "set_project_site_analysis",
      {
        p_project_id: projectId,
        p_analysis: analysis,
        p_provider: provider,
        p_model: model
      }
    );
    if (saveError) throw saveError;

    return NextResponse.json({
      analysis,
      provider,
      model,
      project: updated,
      paidProviderUsed: provider === "openai"
    });
  } catch (error) {
    return apiError(error, "Unable to create the detailed website analysis.");
  }
}
