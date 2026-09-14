import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";


type Props = { params: Promise<{ projectId: string }> };

function enabled(value: string | undefined) {
  return value === "true";
}

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
}

export default async function AIStatusPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,business_name,primary_domain,source_domain")
    .eq("id", projectId)
    .single();
  if (projectError || !project) notFound();

  const { data: usageRows, error: usageError } = await supabase
    .from("model_usage")
    .select("provider,model,input_tokens,output_tokens,cached_input_tokens,provider_cost_usd,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(250);
  if (usageError) throw usageError;

  const usage = usageRows ?? [];
  const inputTokens = usage.reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0);
  const outputTokens = usage.reduce((sum, row) => sum + Number(row.output_tokens ?? 0), 0);
  const providerCost = usage.reduce((sum, row) => sum + Number(row.provider_cost_usd ?? 0), 0);

  const openAIConnected = configured(process.env.OPENAI_API_KEY);
  const planningModel = process.env.OPENAI_PLANNING_MODEL?.trim() || null;
  const buildModel = process.env.OPENAI_BUILD_MODEL?.trim() || null;
  const agentModel = process.env.OPENAI_AGENT_MODEL?.trim() || planningModel;
  const paidAIEnabled = enabled(process.env.SITE_REFINER_PAID_AI_ENABLED);
  const paidBuildsEnabled = enabled(process.env.SITE_REFINER_PAID_BUILDS_ENABLED);
  const liveAgentsEnabled = enabled(process.env.ZIEPHER_AGENT_LIVE_ENABLED);
  const budget = Number(process.env.ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD ?? "0");
  const budgetConfigured = Number.isFinite(budget) && budget > 0;
  const outputLimitsConfigured = [
    process.env.OPENAI_PLANNING_MAX_OUTPUT_TOKENS,
    process.env.OPENAI_BUILD_MAX_OUTPUT_TOKENS,
    process.env.OPENAI_AGENT_MAX_OUTPUT_TOKENS
  ].every(configured);

  const liveReady =
    openAIConnected &&
    Boolean(planningModel) &&
    budgetConfigured &&
    outputLimitsConfigured;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZLIFE AI</div>
            <div className="brand-subtitle">PROVIDER & SAFETY STATUS</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}/studio`}>AI workspace</Link>
          <Link className="button" href={`/projects/${projectId}/usage`}>Usage & cost</Link>
          <Link className="button" href={`/projects/${projectId}`}>Website overview</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 22, maxWidth: 1120 }}>
        <div>
          <p className="panel-label">{project.business_name ?? project.name}</p>
          <h1 style={{ margin: "6px 0 8px" }}>AI connection and safety status</h1>
          <p className="auth-copy" style={{ maxWidth: 820, margin: 0 }}>
            This page reports configuration state only. Secret keys are never displayed, and viewing this page cannot call an AI provider or spend credits.
          </p>
        </div>

        <section className="project-grid" style={{ marginTop: 0 }}>
          <article className="project-card">
            <p className="panel-label">OpenAI connection</p>
            <h2>{openAIConnected ? "Connected" : "Not connected"}</h2>
            <p>{openAIConnected ? "A server-side API key is configured." : "No production OPENAI_API_KEY is configured."}</p>
          </article>
          <article className="project-card">
            <p className="panel-label">Guarded live readiness</p>
            <h2>{liveReady ? "Ready for explicit activation" : "Not ready"}</h2>
            <p>Requires a key, explicit model IDs, a positive monthly budget, and output-token limits.</p>
          </article>
          <article className="project-card">
            <p className="panel-label">Recorded AI provider cost</p>
            <h2>{money(providerCost)}</h2>
            <p>{usage.length} recorded model-usage event{usage.length === 1 ? "" : "s"} for this project.</p>
          </article>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Safety gates</p>
          <h2 style={{ margin: "6px 0 14px" }}>Nothing paid turns on from this page</h2>
          <div className="project-grid" style={{ marginTop: 0 }}>
            <article className="project-card"><strong>Paid AI proposals</strong><p>{paidAIEnabled ? "Owner gate enabled" : "Disabled"}</p></article>
            <article className="project-card"><strong>Paid AI builds</strong><p>{paidBuildsEnabled ? "Owner gate enabled" : "Disabled"}</p></article>
            <article className="project-card"><strong>Live specialist agents</strong><p>{liveAgentsEnabled ? "Owner gate enabled" : "Disabled"}</p></article>
            <article className="project-card"><strong>Monthly provider budget</strong><p>{budgetConfigured ? money(budget) : "Not configured — fails closed"}</p></article>
            <article className="project-card"><strong>Output-token limits</strong><p>{outputLimitsConfigured ? "Configured" : "Incomplete — live OpenAI fails closed"}</p></article>
          </div>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Configured models</p>
          <div className="project-grid" style={{ marginTop: 12 }}>
            <article className="project-card"><strong>Planning</strong><p>{planningModel ?? "Not configured"}</p></article>
            <article className="project-card"><strong>Build</strong><p>{buildModel ?? "Not configured"}</p></article>
            <article className="project-card"><strong>Specialist agents</strong><p>{agentModel ?? "Not configured"}</p></article>
          </div>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Measured usage</p>
          <div className="project-grid" style={{ marginTop: 12 }}>
            <article className="project-card"><strong>Input tokens</strong><h2>{inputTokens.toLocaleString()}</h2></article>
            <article className="project-card"><strong>Output tokens</strong><h2>{outputTokens.toLocaleString()}</h2></article>
            <article className="project-card"><strong>Provider cost</strong><h2>{money(providerCost)}</h2></article>
          </div>
        </section>
      </section>
    </main>
  );
}
