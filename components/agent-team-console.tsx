"use client";

import { useMemo, useState } from "react";
import { agentById, defaultAgentWorkflow, ziepherAgents } from "@/lib/agents/registry";

type RunState = "idle" | "running" | "done" | "error";

type AgentResult = {
  agentId: string;
  status: "queued" | "complete";
  output: string;
};

export type SavedRun = {
  id: string;
  brief: string;
  mode: "dry_run" | "live";
  status: string;
  agent_count: number;
  completed_count: number;
  blocked_count: number;
  input_tokens: number;
  output_tokens: number;
  provider_cost_usd: number | string;
  summary: string | null;
  created_at: string;
  completed_at: string | null;
};

type Props = {
  initialHistory: SavedRun[];
};

export function AgentTeamConsole({ initialHistory }: Props) {
  const [brief, setBrief] = useState(
    "Build and improve Ziepher for Tree Service Businesses using the existing Ziepher platform, GitHub source of truth, Supabase, Vercel, and safe approval gates."
  );
  const [state, setState] = useState<RunState>("idle");
  const [results, setResults] = useState<AgentResult[]>([]);
  const [history, setHistory] = useState<SavedRun[]>(initialHistory);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("atlas");

  const selected = useMemo(
    () => agentById.get(selectedAgent) ?? ziepherAgents[0],
    [selectedAgent]
  );

  async function runTeam() {
    const normalized = brief.trim();
    if (!normalized || state === "running") return;

    setState("running");
    setResults([]);
    setError(null);

    const response = await fetch("/api/team/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: normalized })
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          run?: SavedRun;
          steps?: Array<{ agent_id: string; feedback: string | null }>;
        }
      | null;

    if (!response.ok || !payload?.steps || !payload.run) {
      setError(payload?.error ?? "The team run could not be saved.");
      setState("error");
      return;
    }

    setResults(
      payload.steps.map((step) => ({
        agentId: step.agent_id,
        status: "complete" as const,
        output: step.feedback ?? "Review completed."
      }))
    );
    setHistory((current) => [payload.run!, ...current].slice(0, 10));
    setState("done");
  }

  function resetRun() {
    setResults([]);
    setError(null);
    setState("idle");
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section className="auth-card" style={{ maxWidth: "none" }}>
        <p className="panel-label">Project handoff</p>
        <h1 style={{ margin: "6px 0 10px" }}>Run a project through the Ziepher Tech agent team</h1>
        <p className="auth-copy" style={{ maxWidth: 850 }}>
          Zero-cost team runs are now saved to Ziepher. Every run records the project brief, all 22 specialist handoffs, completion state, token usage, and provider cost. Live paid execution remains disabled until budget and approval controls are enabled.
        </p>
        <label style={{ display: "grid", gap: 8, marginTop: 18 }}>
          <strong>Project brief</strong>
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            rows={6}
            maxLength={12000}
            style={{
              width: "100%",
              resize: "vertical",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.16)",
              padding: 14,
              background: "rgba(0,0,0,.22)",
              color: "inherit",
              font: "inherit"
            }}
          />
        </label>
        <div className="inline-actions" style={{ marginTop: 16 }}>
          <button className="button primary" onClick={runTeam} disabled={state === "running" || !brief.trim()}>
            {state === "running" ? "Team working…" : "Run and save full 22-agent team"}
          </button>
          {results.length || error ? (
            <button className="button" onClick={resetRun} disabled={state === "running"}>
              Reset
            </button>
          ) : null}
        </div>
        {error ? <p style={{ marginTop: 12 }}>{error}</p> : null}
      </section>

      <section className="auth-card" style={{ maxWidth: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <p className="panel-label">Run history</p>
            <h2 style={{ margin: "6px 0" }}>Saved team reviews</h2>
          </div>
          <span className="status-pill">{history.length} recent</span>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {history.map((run) => (
            <article key={run.id} style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{run.completed_count}/{run.agent_count} agents completed</strong>
                <span className="status-pill">{run.mode === "dry_run" ? "Zero-cost" : "Live"} · {run.status}</span>
              </div>
              <p className="auth-copy" style={{ margin: "8px 0 4px" }}>{run.brief}</p>
              <small style={{ opacity: 0.68 }}>
                {new Date(run.created_at).toLocaleString()} · ${Number(run.provider_cost_usd).toFixed(4)} provider cost · {run.input_tokens + run.output_tokens} tokens
              </small>
            </article>
          ))}
          {!history.length ? <p className="auth-copy">No saved team runs yet.</p> : null}
        </div>
      </section>

      <section className="auth-card" style={{ maxWidth: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <p className="panel-label">Team directory</p>
            <h2 style={{ margin: "6px 0" }}>22 named specialists</h2>
          </div>
          <span className="status-pill">{ziepherAgents.length} agents</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginTop: 18 }}>
          {ziepherAgents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedAgent(agent.id)}
              aria-pressed={selectedAgent === agent.id}
              style={{
                textAlign: "left",
                padding: 14,
                borderRadius: 14,
                border: selectedAgent === agent.id ? "1px solid #f47a22" : "1px solid rgba(255,255,255,.12)",
                background: selectedAgent === agent.id ? "rgba(244,122,34,.12)" : "rgba(255,255,255,.03)",
                color: "inherit",
                cursor: "pointer"
              }}
            >
              <strong style={{ display: "block" }}>{agent.name}</strong>
              <span style={{ display: "block", opacity: 0.72, marginTop: 4, fontSize: 13 }}>{agent.title}</span>
            </button>
          ))}
        </div>

        <article style={{ marginTop: 18, padding: 18, borderRadius: 16, border: "1px solid rgba(255,255,255,.12)" }}>
          <p className="panel-label">{selected.department}</p>
          <h3 style={{ margin: "6px 0 4px" }}>{selected.name} — {selected.title}</h3>
          <p className="auth-copy">{selected.personality}</p>
          <p>{selected.mission}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 14 }}>
            <div><strong>Owns</strong><p className="auth-copy">{selected.responsibilities.join(" · ")}</p></div>
            <div><strong>Can decide</strong><p className="auth-copy">{selected.canDecide.join(" · ")}</p></div>
            <div><strong>Must escalate</strong><p className="auth-copy">{selected.mustEscalate.join(" · ")}</p></div>
          </div>
        </article>
      </section>

      <section className="auth-card" style={{ maxWidth: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <p className="panel-label">Latest team run</p>
            <h2 style={{ margin: "6px 0" }}>Handoff sequence</h2>
          </div>
          <span className="status-pill">{state === "done" ? "Saved" : state === "running" ? "In progress" : state === "error" ? "Needs attention" : "Ready"}</span>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {defaultAgentWorkflow.map((agentId, index) => {
            const agent = agentById.get(agentId)!;
            const result = results.find((item) => item.agentId === agentId);
            return (
              <article key={agentId} style={{ display: "grid", gridTemplateColumns: "44px minmax(160px,220px) 1fr", gap: 12, alignItems: "start", padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: result?.status === "complete" ? "rgba(255,255,255,.035)" : "transparent" }}>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <div><strong>{agent.name}</strong><small style={{ display: "block", opacity: 0.68, marginTop: 3 }}>{agent.title}</small></div>
                <p className="auth-copy" style={{ margin: 0 }}>{result?.output ?? agent.mission}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
