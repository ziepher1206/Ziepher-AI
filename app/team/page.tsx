import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentTeamConsole } from "@/components/agent-team-console";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function AgentTeamPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) {
    throw workspaceError ?? new Error("Workspace unavailable.");
  }

  const { data: runs } = await supabase
    .from("agent_runs")
    .select("id,brief,mode,status,agent_count,completed_count,blocked_count,input_tokens,output_tokens,provider_cost_usd,summary,created_at,completed_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(10);

  const budgetUsd = Number(process.env.ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD ?? "0");
  const outputLimitsConfigured = [
    process.env.OPENAI_PLANNING_MAX_OUTPUT_TOKENS,
    process.env.OPENAI_BUILD_MAX_OUTPUT_TOKENS,
    process.env.OPENAI_AGENT_MAX_OUTPUT_TOKENS
  ].every((value) => Boolean(value?.trim()));
  const liveAIAvailable =
    process.env.SITE_REFINER_PAID_AI_ENABLED === "true" &&
    process.env.ZIEPHER_AGENT_LIVE_ENABLED === "true" &&
    Boolean(process.env.OPENAI_API_KEY?.trim()) &&
    Boolean((process.env.OPENAI_AGENT_MODEL ?? process.env.OPENAI_PLANNING_MODEL)?.trim()) &&
    Number.isFinite(budgetUsd) &&
    budgetUsd > 0 &&
    outputLimitsConfigured;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER TECH</div>
            <div className="brand-subtitle">AGENT TEAM</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Operate</Link>
          <Link className="button" href="/projects">Projects</Link>
          <Link className="button" href="/settings">Settings</Link>
        </div>
      </header>

      <AgentTeamConsole
        initialHistory={runs ?? []}
        liveAIAvailable={liveAIAvailable}
        monthlyBudgetUsd={Number.isFinite(budgetUsd) && budgetUsd > 0 ? budgetUsd : null}
      />
    </main>
  );
}
