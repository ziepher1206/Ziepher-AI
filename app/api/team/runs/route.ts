import { NextResponse } from "next/server";
import { executeLiveAgent, liveAgentExecutionEnabled } from "@/lib/agents/execute";
import { agentById, defaultAgentWorkflow } from "@/lib/agents/registry";
import {
  assertAIProviderBudget,
  currentUtcMonthStart
} from "@/lib/ai/spend-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function dryRunFeedback(agentId: string, brief: string) {
  const agent = agentById.get(agentId);
  if (!agent) return "Agent unavailable.";
  const focus = agent.responsibilities.slice(0, 3).join(", ");
  return `${agent.name} reviewed the project through the lens of ${focus}. Recommended next step: ${agent.mission} Project context: ${brief.slice(0, 220)}${brief.length > 220 ? "…" : ""}`;
}

async function getWorkspace(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: workspaceId, error } = await supabase.rpc("ensure_personal_workspace");
  if (error || !workspaceId) throw error ?? new Error("Workspace unavailable.");
  return workspaceId as string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspace(supabase);
  const { data: runs, error } = await supabase
    .from("agent_runs")
    .select("id,brief,mode,status,agent_count,completed_count,blocked_count,input_tokens,output_tokens,provider_cost_usd,summary,created_at,completed_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ runs: runs ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    brief?: unknown;
    mode?: unknown;
    confirmPaidAI?: unknown;
  } | null;
  const brief = typeof body?.brief === "string" ? body.brief.trim() : "";
  const mode = body?.mode === "live" ? "live" : "dry_run";
  if (!brief) return NextResponse.json({ error: "Project brief is required." }, { status: 400 });
  if (brief.length > 12000) return NextResponse.json({ error: "Project brief is too long." }, { status: 400 });

  if (mode === "live") {
    if (body?.confirmPaidAI !== true) {
      return NextResponse.json(
        { error: "Live AI execution requires explicit paid-AI confirmation." },
        { status: 400 }
      );
    }
    if (process.env.SITE_REFINER_PAID_AI_ENABLED !== "true") {
      return NextResponse.json(
        { error: "Live AI execution is disabled by the ZLife owner." },
        { status: 403 }
      );
    }
    if (!liveAgentExecutionEnabled()) {
      return NextResponse.json(
        { error: "Live specialist-agent execution is disabled." },
        { status: 403 }
      );
    }
  }

  const workspaceId = await getWorkspace(supabase);
  const now = new Date().toISOString();
  let existingMonthlySpendUsd = 0;
  let monthlyBudgetUsd: number | null = null;

  if (mode === "live") {
    const { data: costEvents, error: costError } = await admin
      .from("project_cost_events")
      .select("provider_cost_usd")
      .eq("workspace_id", workspaceId)
      .eq("category", "ai")
      .gte("created_at", currentUtcMonthStart());
    if (costError) {
      return NextResponse.json({ error: costError.message }, { status: 500 });
    }
    existingMonthlySpendUsd = (costEvents ?? []).reduce(
      (sum, event) => sum + Number(event.provider_cost_usd ?? 0),
      0
    );
    const budget = assertAIProviderBudget(existingMonthlySpendUsd);
    monthlyBudgetUsd = budget.budgetUsd;
  }

  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      workspace_id: workspaceId,
      requested_by: user.id,
      brief,
      mode,
      status: "running",
      agent_count: defaultAgentWorkflow.length,
      started_at: now,
      metadata: {
        source: "team_console",
        execution: mode === "live" ? "openai" : "deterministic",
        monthly_budget_usd: monthlyBudgetUsd,
        monthly_spend_before_run_usd: existingMonthlySpendUsd
      }
    })
    .select("id")
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: runError?.message ?? "Unable to create team run." }, { status: 500 });
  }

  if (mode === "dry_run") {
    const steps = defaultAgentWorkflow.map((agentId, index) => {
      const agent = agentById.get(agentId)!;
      return {
        run_id: run.id,
        workspace_id: workspaceId,
        agent_id: agent.id,
        agent_name: agent.name,
        agent_title: agent.title,
        sequence: index + 1,
        status: "completed",
        feedback: dryRunFeedback(agentId, brief),
        decision: agent.mustEscalate.length ? `Escalate when: ${agent.mustEscalate.join("; ")}` : null,
        blockers: [],
        input_tokens: 0,
        output_tokens: 0,
        provider_cost_usd: 0,
        provider: "deterministic",
        model: "none",
        started_at: now,
        completed_at: now
      };
    });

    const { error: stepsError } = await supabase.from("agent_run_steps").insert(steps);
    if (stepsError) {
      await supabase
        .from("agent_runs")
        .update({ status: "failed", summary: stepsError.message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", run.id);
      return NextResponse.json({ error: stepsError.message }, { status: 500 });
    }

    const completedAt = new Date().toISOString();
    const summary = "Full 22-agent deterministic review completed and saved. No paid model calls or production changes were made.";
    const { error: completeError } = await supabase
      .from("agent_runs")
      .update({
        status: "completed",
        completed_count: steps.length,
        blocked_count: 0,
        summary,
        completed_at: completedAt,
        updated_at: completedAt
      })
      .eq("id", run.id);

    if (completeError) return NextResponse.json({ error: completeError.message }, { status: 500 });

    return NextResponse.json({
      run: {
        id: run.id,
        brief,
        mode: "dry_run",
        status: "completed",
        agent_count: steps.length,
        completed_count: steps.length,
        blocked_count: 0,
        input_tokens: 0,
        output_tokens: 0,
        provider_cost_usd: 0,
        summary,
        created_at: now,
        completed_at: completedAt
      },
      steps
    });
  }

  const steps: Array<Record<string, unknown>> = [];
  let completedCount = 0;
  let blockedCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let providerCostUsd = 0;
  let upstreamContext = "";

  for (const [index, agentId] of defaultAgentWorkflow.entries()) {
    const agent = agentById.get(agentId)!;
    const startedAt = new Date().toISOString();
    try {
      assertAIProviderBudget(existingMonthlySpendUsd + providerCostUsd);
      const result = await executeLiveAgent({
        agentId,
        projectBrief: brief,
        upstreamContext
      });
      const usage = result.usage;
      const step = {
        run_id: run.id,
        workspace_id: workspaceId,
        agent_id: agent.id,
        agent_name: agent.name,
        agent_title: agent.title,
        sequence: index + 1,
        status: "completed",
        feedback: result.output,
        decision: agent.mustEscalate.length ? `Escalate when: ${agent.mustEscalate.join("; ")}` : null,
        blockers: [],
        input_tokens: usage?.inputTokens ?? 0,
        output_tokens: usage?.outputTokens ?? 0,
        provider_cost_usd: usage?.providerCostUsd ?? 0,
        provider: "openai",
        model: result.model,
        started_at: startedAt,
        completed_at: new Date().toISOString()
      };
      const { error: stepError } = await supabase.from("agent_run_steps").insert(step);
      if (stepError) throw stepError;

      if (usage) {
        const { error: usageError } = await admin.from("model_usage").insert({
          workspace_id: workspaceId,
          operation: `agent_review:${agent.id}`,
          billable_to_user: false,
          provider: "openai",
          model: result.model,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          cached_input_tokens: usage.cachedInputTokens,
          provider_cost_usd: usage.providerCostUsd,
          customer_usage_usd: 0,
          usage_metadata: {
            source: "team_console",
            agent_run_id: run.id,
            agent_id: agent.id,
            pricing_known: usage.pricingKnown
          }
        });
        if (usageError) throw usageError;
        inputTokens += usage.inputTokens;
        outputTokens += usage.outputTokens;
        providerCostUsd += usage.providerCostUsd;
      }
      completedCount += 1;
      upstreamContext = result.output.slice(0, 16_000);
      steps.push(step);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      blockedCount += 1;
      const step = {
        run_id: run.id,
        workspace_id: workspaceId,
        agent_id: agent.id,
        agent_name: agent.name,
        agent_title: agent.title,
        sequence: index + 1,
        status: "blocked",
        feedback: null,
        decision: null,
        blockers: [message.slice(0, 1000)],
        input_tokens: 0,
        output_tokens: 0,
        provider_cost_usd: 0,
        provider: "openai",
        model: process.env.OPENAI_AGENT_MODEL ?? process.env.OPENAI_PLANNING_MODEL ?? null,
        started_at: startedAt,
        completed_at: new Date().toISOString()
      };
      await supabase.from("agent_run_steps").insert(step);
      steps.push(step);

      if (message.includes("monthly provider budget reached")) break;
    }
  }

  const completedAt = new Date().toISOString();
  const status = blockedCount > 0 ? "blocked" : "completed";
  const summary = blockedCount > 0
    ? `Live specialist review stopped or partially completed: ${completedCount} completed, ${blockedCount} blocked.`
    : `Live ${completedCount}-agent specialist review completed with measured provider usage.`;

  const { error: completeError } = await supabase
    .from("agent_runs")
    .update({
      status,
      completed_count: completedCount,
      blocked_count: blockedCount,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      provider_cost_usd: providerCostUsd,
      customer_usage_usd: 0,
      summary,
      completed_at: completedAt,
      updated_at: completedAt
    })
    .eq("id", run.id);
  if (completeError) return NextResponse.json({ error: completeError.message }, { status: 500 });

  return NextResponse.json({
    run: {
      id: run.id,
      brief,
      mode: "live",
      status,
      agent_count: defaultAgentWorkflow.length,
      completed_count: completedCount,
      blocked_count: blockedCount,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      provider_cost_usd: providerCostUsd,
      summary,
      created_at: now,
      completed_at: completedAt
    },
    steps
  });
}
