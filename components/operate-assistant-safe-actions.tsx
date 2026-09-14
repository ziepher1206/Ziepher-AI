"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AssistantSafeActionSuggestion = {
  key: string;
  title: string;
  detail: string;
  signalKind:
    | "lead_received"
    | "estimate_ready"
    | "estimate_accepted"
    | "job_completed"
    | "review_ready"
    | "growth_ready";
  entityId: string;
};

type AutomationEvent = {
  id: string;
  event_type: string;
  entity_type: string;
  status: string;
  risk_level: string;
  created_at: string;
  last_error: string | null;
};

export function OperateAssistantSafeActions({
  suggestions,
  recentEvents,
}: {
  suggestions: AssistantSafeActionSuggestion[];
  recentEvents: AutomationEvent[];
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function queueAction(item: AssistantSafeActionSuggestion) {
    setBusyKey(item.key);
    setMessage(null);

    const response = await fetch("/api/operate/assistant/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: item.signalKind,
        entityId: item.entityId,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusyKey(null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to queue this internal action.");
      return;
    }

    setMessage("Internal preparation queued. No message, charge, publish, or external action was executed.");
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "start",
        }}
      >
        <div>
          <p className="panel-label">Safe action orchestration</p>
          <h2 style={{ margin: "6px 0 8px" }}>Let ZLife prepare internal work, not risky execution.</h2>
          <p className="auth-copy" style={{ maxWidth: 850, margin: 0 }}>
            These controls can only add audited internal preparation events. Appointment scheduling,
            crew assignment, customer communication, publishing, charging, provider purchases, and
            destructive actions remain blocked here.
          </p>
        </div>
        <span className="status-pill">Internal-only queue</span>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {suggestions.map((item) => (
          <article className="project-card" key={item.key} style={{ minHeight: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 420px" }}>
                <strong>{item.title}</strong>
                <p className="auth-copy" style={{ margin: "6px 0 0" }}>{item.detail}</p>
              </div>
              <button
                className="button primary"
                type="button"
                disabled={busyKey !== null}
                onClick={() => queueAction(item)}
              >
                {busyKey === item.key ? "Queueing…" : "Queue internal prep"}
              </button>
            </div>
          </article>
        ))}
        {!suggestions.length ? (
          <p className="auth-copy">No safe internal preparation action is waiting right now.</p>
        ) : null}
      </div>

      {message ? <p className="auth-copy" style={{ marginTop: 12 }}>{message}</p> : null}

      <div style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 16 }}>
        <p className="panel-label">Recent automation evidence</p>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {recentEvents.map((event) => (
            <div key={event.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span>
                <strong>{event.event_type.replaceAll("_", " ")}</strong>
                <span className="auth-copy"> · {event.entity_type} · {event.risk_level}</span>
              </span>
              <span className="status-pill">{event.status}</span>
              {event.last_error ? <small className="auth-copy" style={{ width: "100%" }}>{event.last_error}</small> : null}
            </div>
          ))}
          {!recentEvents.length ? <p className="auth-copy">No automation events have been queued yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
