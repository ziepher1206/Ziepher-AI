import { NextResponse } from "next/server";
import { z } from "zod";
import { createFreePlan } from "@/lib/ai/router";
import {
  assertAIProviderBudget,
  currentUtcMonthStart
} from "@/lib/ai/spend-guard";
import { apiError } from "@/lib/http";
import {
  projectAIContextSchema,
  projectIdSchema
} from "@/lib/domain/schemas";
import { parseProjectSyncState } from "@/lib/sync/project-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  idea: z.string().trim().min(10).max(12000),
  context: projectAIContextSchema.optional()
});

type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = requestSchema.parse(await request.json());
    const supabase = await createClient();
    const admin = createAdminClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,workspace_id")
      .eq("id", projectId)
      .single();
    if (projectError || !project) throw new Error("Project not found.");

    const paidAIEnabled = process.env.SITE_REFINER_PAID_AI_ENABLED === "true";
    let budget: ReturnType<typeof assertAIProviderBudget> | null = null;
    if (paidAIEnabled) {
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
      budget = assertAIProviderBudget(spentThisMonth);
    }

    const { data: syncRows, error: syncError } = await supabase.rpc(
      "get_project_sync_state",
      { p_project_id: projectId }
    );
    if (syncError) throw new Error(syncError.message);
    const syncRow = Array.isArray(syncRows) ? syncRows[0] : syncRows;
    const projectContext =
      input.context ?? parseProjectSyncState(syncRow?.state).aiContext;

    const result = await createFreePlan(input.idea, projectContext, {
      allowPaidProviders: paidAIEnabled
    });
    const projectPlan = { ...result.plan, projectId };
    const { data: specVersionId, error } = await supabase.rpc(
      "save_project_plan",
      {
        p_project_id: projectId,
        p_idea: input.idea,
        p_plan: projectPlan,
        p_provider: result.provider,
        p_model: result.model
      }
    );

    if (error) throw error;

    if (result.usage) {
      const { error: usageError } = await admin.from("model_usage").insert({
        workspace_id: project.workspace_id,
        project_id: projectId,
        operation: "project_planning",
        billable_to_user: false,
        provider: result.provider,
        model: result.model,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        cached_input_tokens: result.usage.cachedInputTokens,
        provider_cost_usd: result.usage.providerCostUsd,
        customer_usage_usd: 0,
        usage_metadata: {
          source: "ai_workspace",
          pricing_known: result.usage.pricingKnown,
          monthly_budget_usd: budget?.budgetUsd ?? null,
          monthly_spend_before_call_usd: budget?.spentUsd ?? null
        }
      });
      if (usageError) throw usageError;
    }

    const { data: concepts, error: conceptsError } = await supabase
      .from("visual_concepts")
      .select("id,name,description,tokens,selected")
      .eq("project_id", projectId)
      .eq("spec_version_id", specVersionId)
      .order("created_at");

    if (conceptsError) throw conceptsError;

    const { data: currentSyncRows, error: currentSyncError } = await supabase.rpc(
      "get_project_sync_state",
      { p_project_id: projectId }
    );
    if (!currentSyncError) {
      const currentSync = Array.isArray(currentSyncRows)
        ? currentSyncRows[0]
        : currentSyncRows;
      if (currentSync) {
        const currentState = parseProjectSyncState(currentSync.state);
        const firstConcept = concepts?.[0];
        const sourceId =
          firstConcept?.tokens &&
          typeof firstConcept.tokens === "object" &&
          "source_id" in firstConcept.tokens &&
          typeof firstConcept.tokens.source_id === "string"
            ? firstConcept.tokens.source_id
            : projectPlan.visualDirections[0]?.id;

        const { error: syncWriteError } = await supabase.rpc(
          "apply_project_sync_patch",
          {
            p_project_id: projectId,
            p_base_revision: Number(currentSync.revision),
            p_event_id: crypto.randomUUID(),
            p_device_id: "server-planner",
            p_event_type: "state.patch",
            p_patch: {
              studio: {
                ...currentState.studio,
                prompt: input.idea,
                plan: projectPlan,
                selectedConcept: sourceId,
                updatedAt: new Date().toISOString()
              },
              aiContext: projectContext
            }
          }
        );
        if (
          syncWriteError &&
          !syncWriteError.message.includes("SYNC_CONFLICT:")
        ) {
          throw new Error(syncWriteError.message);
        }
      }
    }

    return NextResponse.json({
      plan: projectPlan,
      provider: result.provider,
      model: result.model,
      providerCostUsd: result.usage?.providerCostUsd ?? 0,
      specVersionId,
      concepts,
      chargedBuildCredits: 0
    });
  } catch (error) {
    return apiError(error, "Unable to save the project plan.");
  }
}
