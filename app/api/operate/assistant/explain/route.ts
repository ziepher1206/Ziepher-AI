import { NextResponse } from "next/server";
import { assistantExplanationInputSchema } from "@/lib/ai/operate-assistant";
import { explainOperatePrioritiesWithOpenAI } from "@/lib/ai/providers/openai-operate-assistant";
import {
  assertAIProviderBudget,
  currentUtcMonthStart
} from "@/lib/ai/spend-guard";
import { apiError } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = assistantExplanationInputSchema.parse(await request.json());
    if (process.env.ZLIFE_ASSISTANT_PAID_AI_ENABLED !== "true") {
      throw new Error("Live ZLife Assistant AI is disabled by the owner.");
    }

    const supabase = await createClient();
    const admin = createAdminClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: workspaceId, error: workspaceError } = await supabase.rpc(
      "ensure_personal_workspace"
    );
    if (workspaceError || !workspaceId) {
      throw workspaceError ?? new Error("Workspace unavailable.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("workspace_business_profiles")
      .select("business_name")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (profileError) throw profileError;
    const businessName = profile?.business_name?.trim() || input.businessName;

    const { data: costEvents, error: costError } = await admin
      .from("project_cost_events")
      .select("provider_cost_usd")
      .eq("workspace_id", workspaceId)
      .eq("category", "ai")
      .gte("created_at", currentUtcMonthStart());
    if (costError) throw costError;
    const spentThisMonth = (costEvents ?? []).reduce(
      (sum, event) => sum + Number(event.provider_cost_usd ?? 0),
      0
    );
    const budget = assertAIProviderBudget(spentThisMonth);

    const result = await explainOperatePrioritiesWithOpenAI({
      businessName,
      priorities: input.priorities
    });

    const { error: usageError } = await admin.from("model_usage").insert({
      workspace_id: workspaceId,
      operation: "operate_assistant_explanation",
      billable_to_user: false,
      provider: result.provider,
      model: result.model,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      cached_input_tokens: result.usage.cachedInputTokens,
      provider_cost_usd: result.usage.providerCostUsd,
      customer_usage_usd: 0,
      usage_metadata: {
        source: "operate_assistant",
        priority_count: input.priorities.length,
        pricing_known: result.usage.pricingKnown,
        monthly_budget_usd: budget.budgetUsd,
        monthly_spend_before_call_usd: budget.spentUsd
      }
    });
    if (usageError) throw usageError;

    return NextResponse.json({
      explanation: result.explanation,
      provider: result.provider,
      model: result.model,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        providerCostUsd: result.usage.providerCostUsd
      }
    });
  } catch (error) {
    return apiError(error, "Unable to create the AI priority explanation.");
  }
}
