"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  jobId: string;
  status: string;
  estimatedValueCents: number | null;
  finalValueCents: number | null;
  approvedChangeOrderCents?: number;
  completionReady: boolean;
  afterPhotoCount: number;
  invoiceId?: string | null;
};

type FieldAction = "depart" | "arrive" | "start" | "weather" | "pause" | "resume" | "complete";

function centsToInput(cents: number | null) {
  return ((cents ?? 0) / 100).toFixed(2);
}

export function OperateJobExecution({
  jobId,
  status,
  estimatedValueCents,
  finalValueCents,
  approvedChangeOrderCents = 0,
  completionReady,
  afterPhotoCount,
  invoiceId
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<FieldAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suggestedFinal = finalValueCents ?? (estimatedValueCents ?? 0) + approvedChangeOrderCents;
  const [finalValue, setFinalValue] = useState(centsToInput(suggestedFinal));

  async function run(action: FieldAction) {
    setBusy(action);
    setError(null);
    const parsed = Math.round(Number(finalValue) * 100);
    if (action === "complete" && (!Number.isFinite(parsed) || parsed < 0)) {
      setError("Enter a valid final job value.");
      setBusy(null);
      return;
    }

    const response = await fetch(`/api/operate/jobs/${jobId}/execution`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "complete" ? { action, finalValueCents: parsed } : { action })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error ?? "Unable to update job.");
      setBusy(null);
      return;
    }

    if (action === "complete" && payload?.invoiceId) {
      router.push(`/operate/invoices/${payload.invoiceId}`);
      return;
    }

    setBusy(null);
    router.refresh();
  }

  if (status === "completed") {
    return (
      <section className="auth-card" style={{ maxWidth: "none", marginTop: 20 }}>
        <p className="panel-label">Job complete</p>
        <h2 style={{ margin: "6px 0 8px" }}>Work finished</h2>
        <p className="auth-copy" style={{ marginTop: 0 }}>Completion proof is recorded and execution changes are locked.</p>
        {invoiceId ? <button className="button primary" onClick={() => router.push(`/operate/invoices/${invoiceId}`)}>Open invoice</button> : null}
      </section>
    );
  }

  if (status === "canceled") return null;

  return (
    <section className="auth-card" style={{ maxWidth: "none", marginTop: 20 }}>
      <p className="panel-label">Crew field controls</p>
      <h2 style={{ margin: "6px 0 8px" }}>Run the job</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Update the field state as the crew moves from dispatch through completion.</p>

      <div className="inline-actions" style={{ marginTop: 14 }}>
        {(["draft", "scheduled"].includes(status)) ? <button className="button primary" disabled={!!busy} onClick={() => run("depart")}>{busy === "depart" ? "Updating…" : "En route"}</button> : null}
        {status === "en_route" ? <button className="button primary" disabled={!!busy} onClick={() => run("arrive")}>{busy === "arrive" ? "Updating…" : "Arrived"}</button> : null}
        {(["draft", "scheduled", "arrived"].includes(status)) ? <button className="button" disabled={!!busy} onClick={() => run("start")}>{busy === "start" ? "Starting…" : "Start work"}</button> : null}
        {(["arrived", "active", "paused"].includes(status)) ? <button className="button" disabled={!!busy} onClick={() => run("weather")}>{busy === "weather" ? "Updating…" : "Weather delay"}</button> : null}
        {status === "active" ? <button className="button" disabled={!!busy} onClick={() => run("pause")}>{busy === "pause" ? "Pausing…" : "Pause"}</button> : null}
        {(["paused", "weather_delay"].includes(status)) ? <button className="button primary" disabled={!!busy} onClick={() => run("resume")}>{busy === "resume" ? "Resuming…" : "Resume work"}</button> : null}
      </div>

      <div style={{ marginTop: 22, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <span className="status-pill">Checklist {completionReady ? "ready" : "incomplete"}</span>
          <span className="status-pill">After photos: {afterPhotoCount}</span>
          {approvedChangeOrderCents > 0 ? <span className="status-pill">Approved extras: ${(approvedChangeOrderCents / 100).toFixed(2)}</span> : null}
        </div>
        <label className="field" style={{ maxWidth: 260 }}>
          <span>Final invoice value</span>
          <input type="number" min="0" step="0.01" value={finalValue} onChange={(event) => setFinalValue(event.target.value)} />
        </label>
        <p className="auth-copy" style={{ margin: "8px 0 12px" }}>Ziepher will not complete the job until the completion checklist is verified and at least one After photo is stored. Approved change orders are included in the suggested final value.</p>
        <button className="button primary" disabled={!!busy || !completionReady || afterPhotoCount < 1} onClick={() => run("complete")}>{busy === "complete" ? "Completing…" : "Complete job & create invoice"}</button>
      </div>

      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
    </section>
  );
}
