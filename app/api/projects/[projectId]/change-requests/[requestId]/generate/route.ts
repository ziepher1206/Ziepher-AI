import { NextResponse } from "next/server";
import { z } from "zod";
import { createFreePlan } from "@/lib/ai/router";
import {
  assertAIProviderBudget,
  currentUtcMonthStart
} from "@/lib/ai/spend-guard";
import { projectIdSchema } from "@/lib/domain/schemas";
import { apiError } from "@/lib/http";
import { parseProjectSyncState } from "@/lib/sync/project-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestIdSchema = z.string().uuid();
type Context = { params: Promise<{ projectId: string; requestId: string }> };

export async function POST(_request: Request, context: Context) {
  const params = await context.params;
  let requestId: string | null = null;
  let projectId: string | null = null;
  const admin = createAdminClient();

  try {
    projectId = projectIdSchema.parse(params.projectId);
    requestId = requestIdSchema.parse(params.requestId);

    if (process.env.SITE_REFINER_PAID_AI_ENABLED !== "true") {
      throw new Error(
        "AI generation is disabled by the Z-Life owner. Approval is recorded, but no provider call was made."
      );
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,workspace_id,business_name,name,primary_domain,source_domain")
      .eq("id", projectId)
      .single();
    if (projectError || !project) throw new Error("Project not found.");

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

    const { data: changeRequest, error: requestError } = await admin
      .from("site_change_requests")
      .select("id,title,instructions,status,ai_generation_approved")
      .eq("id", requestId)
      .eq("project_id", projectId)
      .single();
    if (requestError || !changeRequest) throw new Error("Change request not found.");
    if (!changeRequest.ai_generation_approved || changeRequest.status !== "ready_for_ai") {
      throw new Error("Explicit AI generation approval is required first.");
    }

    await admin
      .from("site_change_requests")
      .update({ status: "generating" })
      .eq("id", requestId)
      .eq("project_id", projectId);

    const { data: syncRows, error: syncError } = await supabase.rpc(
      "get_project_sync_state",
      { p_project_id: projectId }
    );
    if (syncError) throw new Error(syncError.message);
    const syncRow = Array.isArray(syncRows) ? syncRows[0] : syncRows;
    const aiContext = parseProjectSyncState(syncRow?.state).aiContext;
    const domain = project.primary_domain ?? project.source_domain ?? "the connected website";
    const idea = [
      `Z-Life Build website change for ${project.business_name ?? project.name} (${domain}).`,
      `Change request: ${changeRequest.title}`,
      changeRequest.instructions,
      "Preserve the existing business website and make only the requested improvement. The output must be reviewable before production."
    ].join("\n\n");

    const result = await createFreePlan(idea, aiContext, {
      allowPaidProviders: true
    });
    const { data: specVersionId, error: saveError } = await supabase.rpc(
      "save_project_plan",
      {
        p_project_id: projectId,
        p_idea: idea,
        p_plan: result.plan,
        p_provider: result.provider,
        p_model: result.model
      }
    );
    if (saveError) throw saveError;

    if (result.usage) {
      const { error: usageError } = await admin.from("model_usage").insert({
        project_id: projectId,
        operation: "site_change_planning",
        billable_to_user: false,
        provider: result.provider,
        model: result.model,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        cached_input_tokens: result.usage.cachedInputTokens,
        provider_cost_usd: result.usage.providerCostUsd,
        customer_usage_usd: 0,
        usage_metadata: {
          source: "site_change_request",
          change_request_id: requestId,
          pricing_known: result.usage.pricingKnown,
          monthly_budget_usd: budget.budgetUsd,
          monthly_spend_before_call_usd: budget.spentUsd
        }
      });
      if (usageError) throw usageError;
    }

    const { data: updated, error: updateError } = await admin
      .from("site_change_requests")
      .update({
        status: "proposal_ready",
        spec_version_id: specVersionId,
        change_metadata: {
          planning_provider: result.provider,
          planning_model: result.model,
          estimated_provider_cost_usd: result.estimatedProviderCostUsd ?? 0,
          input_tokens: result.usage?.inputTokens ?? 0,
          output_tokens: result.usage?.outputTokens ?? 0,
          cached_input_tokens: result.usage?.cachedInputTokens ?? 0,
          pricing_known: result.usage?.pricingKnown ?? false,
          monthly_ai_budget_usd: budget.budgetUsd,
          monthly_ai_spend_before_call_usd: budget.spentUsd
        }
      })
      .eq("id", requestId)
      .eq("project_id", projectId)
      .select("id,status,spec_version_id,change_metadata")
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ changeRequest: updated });
  } catch (error) {
    if (requestId && projectId) {
      await admin
        .from("site_change_requests")
        .update({ status: "failed", change_metadata: { generation_error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown generation error" } })
        .eq("id", requestId)
        .eq("project_id", projectId)
        .eq("status", "generating");
    }
    return apiError(error, "Unable to generate the Z-Life Build proposal.");
  }
}
