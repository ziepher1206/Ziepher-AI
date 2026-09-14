"use client";

import { useState } from "react";
import type {
  AssistantExplanation,
  AssistantPriority
} from "@/lib/ai/operate-assistant";

type Props = {
  businessName: string;
  priorities: AssistantPriority[];
  liveAIAvailable: boolean;
};

export function OperateAssistantAI({
  businessName,
  priorities,
  liveAIAvailable
}: Props) {
  const [approved, setApproved] = useState(false);
  const [running, setRunning] = useState(false);
  const [explanation, setExplanation] = useState<AssistantExplanation | null>(null);
  const [costUsd, setCostUsd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function explain() {
    if (!liveAIAvailable || !approved || running) return;
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/operate/assistant/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          priorities,
          confirmPaidAI: true
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            explanation?: AssistantExplanation;
            usage?: { providerCostUsd?: number };
            error?: string;
          }
        | null;
      if (!response.ok || !payload?.explanation) {
        throw new Error(payload?.error ?? "Unable to create the AI explanation.");
      }
      setExplanation(payload.explanation);
      setCostUsd(Number(payload.usage?.providerCostUsd ?? 0));
      setApproved(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the AI explanation.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
        <div>
          <p className="panel-label">Optional AI explanation</p>
          <h2 style={{ margin: "6px 0 8px" }}>Ask ZLife AI to explain today’s priority queue</h2>
        </div>
        <span className="status-pill">{liveAIAvailable ? "Live AI ready" : "Live AI locked"}</span>
      </div>
      <p className="auth-copy" style={{ maxWidth: 860 }}>
        The zero-cost deterministic queue above remains the source of operational facts. Live AI can explain the queue and suggest an order of work, but it cannot send messages, collect payments, publish, schedule, or change production.
      </p>

      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 12 }}>
        <input
          type="checkbox"
          checked={approved}
          onChange={(event) => setApproved(event.target.checked)}
          disabled={!liveAIAvailable || running}
        />
        <span>
          {liveAIAvailable
            ? "I approve one OpenAI explanation request within the configured monthly provider cap."
            : "Live AI requires the OpenAI connection, planning model/output limit, positive monthly budget, and ZLife Assistant owner gate."}
        </span>
      </label>
      <div className="inline-actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="button primary"
          onClick={() => void explain()}
          disabled={!liveAIAvailable || !approved || running}
        >
          {running ? "ZLife AI is reviewing…" : "Explain priorities with AI"}
        </button>
      </div>
      {error ? <p style={{ marginTop: 12 }}>{error}</p> : null}

      {explanation ? (
        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <article className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">AI summary</p>
            <p>{explanation.summary}</p>
            {costUsd !== null ? <small>Measured provider cost for this request: ${costUsd.toFixed(6)}</small> : null}
          </article>
          <div className="project-grid" style={{ marginTop: 0 }}>
            {explanation.nextSteps.map((step, index) => (
              <article className="project-card" key={`${step.title}-${index}`}>
                <div className="project-card-top">
                  <span className="status-pill">{step.urgency}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.reason}</p>
              </article>
            ))}
          </div>
          {explanation.cautions.length ? (
            <article className="project-card" style={{ minHeight: 0 }}>
              <p className="panel-label">Approval boundaries</p>
              <ul style={{ paddingLeft: 20 }}>
                {explanation.cautions.map((caution) => <li key={caution}>{caution}</li>)}
              </ul>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
