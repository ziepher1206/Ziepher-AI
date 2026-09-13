import { NextResponse } from "next/server";
import { agentById, defaultAgentWorkflow } from "@/lib/agents/registry";
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { brief?: unknown } | null;
  const brief = typeof body?.brief === "string" ? body.brief.trim() : "";
  if (!brief) return NextResponse.json({ error: "Project brief is required." }, { status: 400 });
  if (brief.length > 12000) return NextResponse.json({ error: "Project brief is too long." }, { status: 400 });

  const workspaceId = await getWorkspace(supabase);
  const now = new Date().toISOString();

  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      workspace_id: workspaceId,
      requested_by: user.id,
      brief,
      mode: "dry_run",
      status: "running",
      agent_count: defaultAgentWorkflow.length,
      started_at: now,
      metadata: { source: "team_console", execution: "deterministic" }
    })
    .select("id")
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: runError?.message ?? "Unable to create team run." }, { status: 500 });
  }

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
