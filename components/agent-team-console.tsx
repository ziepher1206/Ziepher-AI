"use client";

import { useMemo, useState } from "react";
import { agentById, defaultAgentWorkflow, ziepherAgents } from "@/lib/agents/registry";

type RunState = "idle" | "running" | "done";

type AgentResult = {
  agentId: string;
  status: "queued" | "complete";
  output: string;
};

function dryRunOutput(agentId: string, brief: string) {
  const agent = agentById.get(agentId);
  if (!agent) return "Agent unavailable.";

  const focus = agent.responsibilities.slice(0, 3).join(", ");
  return `${agent.name} reviewed the project through the lens of ${focus}. Recommended next step: ${agent.mission} Project context: ${brief.slice(0, 220)}${brief.length > 220 ? "…" : ""}`;
}

export function AgentTeamConsole() {
  const [brief, setBrief] = useState(
    "Build and improve Ziepher for Tree Service Businesses using the existing Ziepher platform, GitHub source of truth, Supabase, Vercel, and safe approval gates."
  );
  const [state, setState] = useState<RunState>("idle");
  const [results, setResults] = useState<AgentResult[]>([]);
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

    for (const agentId of defaultAgentWorkflow) {
      setResults((current) => [
        ...current,
        { agentId, status: "queued", output: "Reviewing project context…" }
      ]);
      await new Promise((resolve) => window.setTimeout(resolve, 90));
      setResults((current) =>
        current.map((result) =>
          result.agentId === agentId
            ? {
                ...result,
                status: "complete",
                output: dryRunOutput(agentId, normalized)
              }
            : result
        )
      );
    }

    setState("done");
  }

  function resetRun() {
    setResults([]);
    setState("idle");
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section className="auth-card" style={{ maxWidth: "none" }}>
        <p className="panel-label">Project handoff</p>
        <h1 style={{ margin: "6px 0 10px" }}>Run a project through the Ziepher Tech agent team</h1>
        <p className="auth-copy" style={{ maxWidth: 850 }}>
          This first version is a zero-cost dry run. It exercises the full team order and role boundaries without calling a paid AI model or changing production. Live autonomous execution can be connected to the same registry behind explicit budget and approval gates.
        </p>
        <label style={{ display: "grid", gap: 8, marginTop: 18 }}>
          <strong>Project brief</strong>
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            rows={6}
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
            {state === "running" ? "Team working…" : "Run full 22-agent team"}
          </button>
          {results.length ? (
            <button className="button" onClick={resetRun} disabled={state === "running"}>
              Reset
            </button>
          ) : null}
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
            <div>
              <strong>Owns</strong>
              <p className="auth-copy">{selected.responsibilities.join(" · ")}</p>
            </div>
            <div>
              <strong>Can decide</strong>
              <p className="auth-copy">{selected.canDecide.join(" · ")}</p>
            </div>
            <div>
              <strong>Must escalate</strong>
              <p className="auth-copy">{selected.mustEscalate.join(" · ")}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="auth-card" style={{ maxWidth: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <p className="panel-label">Team run</p>
            <h2 style={{ margin: "6px 0" }}>Handoff sequence</h2>
          </div>
          <span className="status-pill">{state === "done" ? "Dry run complete" : state === "running" ? "In progress" : "Ready"}</span>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {defaultAgentWorkflow.map((agentId, index) => {
            const agent = agentById.get(agentId)!;
            const result = results.find((item) => item.agentId === agentId);
            return (
              <article
                key={agentId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px minmax(160px,220px) 1fr",
                  gap: 12,
                  alignItems: "start",
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.1)",
                  background: result?.status === "complete" ? "rgba(255,255,255,.035)" : "transparent"
                }}
              >
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <div>
                  <strong>{agent.name}</strong>
                  <small style={{ display: "block", opacity: 0.68, marginTop: 3 }}>{agent.title}</small>
                </div>
                <p className="auth-copy" style={{ margin: 0 }}>
                  {result?.output ?? agent.mission}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
