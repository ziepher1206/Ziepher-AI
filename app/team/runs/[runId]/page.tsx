import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ runId: string }> };

function money(value: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  }).format(Number(value ?? 0));
}

function dateTime(value: string | null) {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function TeamRunDetailPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { runId } = await params;
  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .select("id,brief,mode,status,agent_count,completed_count,blocked_count,input_tokens,output_tokens,provider_cost_usd,customer_usage_usd,summary,metadata,started_at,created_at,completed_at")
    .eq("id", runId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (runError) throw runError;
  if (!run) notFound();

  const { data: steps, error: stepsError } = await supabase
    .from("agent_run_steps")
    .select("id,agent_id,agent_name,agent_title,sequence,status,feedback,decision,blockers,input_tokens,output_tokens,provider_cost_usd,provider,model,started_at,completed_at")
    .eq("run_id", run.id)
    .eq("workspace_id", workspaceId)
    .order("sequence", { ascending: true });
  if (stepsError) throw stepsError;

  const tokenCount = Number(run.input_tokens ?? 0) + Number(run.output_tokens ?? 0);

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div><div className="brand-title">ZIEPHER TECH</div><div className="brand-subtitle">TEAM RUN</div></div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/team">Team history</Link>
          <Link className="button" href="/operate">Operate</Link>
        </div>
      </header>

      <section className="auth-card" style={{ maxWidth: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "start" }}>
          <div style={{ maxWidth: 900 }}>
            <p className="panel-label">Saved review</p>
            <h1 style={{ margin: "6px 0 10px" }}>{run.mode === "dry_run" ? "Zero-cost team review" : "Live AI team review"}</h1>
            <p className="auth-copy" style={{ margin: 0 }}>{run.brief}</p>
          </div>
          <span className="status-pill">{run.status.replaceAll("_", " ")}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginTop: 20 }}>
          <article className="project-card" style={{ minHeight: 0 }}><small className="auth-copy">Completed</small><strong style={{ display: "block", marginTop: 5 }}>{run.completed_count}/{run.agent_count} agents</strong></article>
          <article className="project-card" style={{ minHeight: 0 }}><small className="auth-copy">Blocked</small><strong style={{ display: "block", marginTop: 5 }}>{run.blocked_count}</strong></article>
          <article className="project-card" style={{ minHeight: 0 }}><small className="auth-copy">Provider cost</small><strong style={{ display: "block", marginTop: 5 }}>{money(run.provider_cost_usd)}</strong></article>
          <article className="project-card" style={{ minHeight: 0 }}><small className="auth-copy">Tokens</small><strong style={{ display: "block", marginTop: 5 }}>{tokenCount.toLocaleString()}</strong></article>
        </div>

        {run.summary ? <p style={{ marginTop: 18 }}><strong>Run summary:</strong> {run.summary}</p> : null}
        <p className="auth-copy" style={{ marginBottom: 0 }}>
          Started {dateTime(run.started_at ?? run.created_at)} · Finished {dateTime(run.completed_at)} · Customer usage {money(run.customer_usage_usd)}
        </p>
      </section>

      <section className="auth-card" style={{ maxWidth: "none" }}>
        <p className="panel-label">Specialist results</p>
        <h2 style={{ margin: "6px 0 8px" }}>Saved handoff sequence</h2>
        <p className="auth-copy" style={{ marginTop: 0 }}>These are the persisted results from this exact run. Reopening history does not call an AI provider or rerun any specialist.</p>

        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {(steps ?? []).map((step) => {
            const blockers = Array.isArray(step.blockers)
              ? step.blockers.filter((value): value is string => typeof value === "string")
              : [];
            return (
              <article key={step.id} className="project-card" style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <small className="auth-copy">Step {String(step.sequence).padStart(2, "0")}</small>
                    <h3 style={{ margin: "4px 0" }}>{step.agent_name} — {step.agent_title}</h3>
                  </div>
                  <span className="status-pill">{step.status}</span>
                </div>

                {step.feedback ? <p style={{ whiteSpace: "pre-wrap" }}>{step.feedback}</p> : null}
                {step.decision ? <p className="auth-copy"><strong>Decision / escalation:</strong> {step.decision}</p> : null}
                {blockers.length ? (
                  <div>
                    <strong>Blockers</strong>
                    <ul>{blockers.map((blocker, index) => <li key={`${step.id}-${index}`}>{blocker}</li>)}</ul>
                  </div>
                ) : null}
                <small className="auth-copy">
                  {step.provider ?? "no provider"}{step.model ? ` · ${step.model}` : ""} · {(Number(step.input_tokens ?? 0) + Number(step.output_tokens ?? 0)).toLocaleString()} tokens · {money(step.provider_cost_usd)}
                </small>
              </article>
            );
          })}
          {!steps?.length ? <p className="auth-copy">No specialist steps were saved for this run.</p> : null}
        </div>
      </section>
    </main>
  );
}
