"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  jobId: string;
  status: string;
  estimatedValueCents: number | null;
  finalValueCents: number | null;
  invoiceId?: string | null;
};

function centsToInput(cents: number | null) {
  return ((cents ?? 0) / 100).toFixed(2);
}

export function OperateJobExecution({ jobId, status, estimatedValueCents, finalValueCents, invoiceId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalValue, setFinalValue] = useState(centsToInput(finalValueCents ?? estimatedValueCents));

  async function run(action: "start" | "pause" | "resume" | "complete") {
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
        <p className="auth-copy" style={{ marginTop: 0 }}>The completed job is locked from further execution changes.</p>
        {invoiceId ? <button className="button primary" onClick={() => router.push(`/operate/invoices/${invoiceId}`)}>Open invoice</button> : null}
      </section>
    );
  }

  if (status === "canceled") return null;

  return (
    <section className="auth-card" style={{ maxWidth: "none", marginTop: 20 }}>
      <p className="panel-label">Run job</p>
      <h2 style={{ margin: "6px 0 8px" }}>Execution & completion</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Track the work, then finish the job and create its draft invoice in one transaction.</p>

      <div className="inline-actions" style={{ marginTop: 14 }}>
        {status === "draft" || status === "scheduled" ? <button className="button primary" disabled={!!busy} onClick={() => run("start")}>{busy === "start" ? "Starting…" : "Start job"}</button> : null}
        {status === "active" ? <button className="button" disabled={!!busy} onClick={() => run("pause")}>{busy === "pause" ? "Pausing…" : "Pause"}</button> : null}
        {status === "paused" ? <button className="button primary" disabled={!!busy} onClick={() => run("resume")}>{busy === "resume" ? "Resuming…" : "Resume"}</button> : null}
      </div>

      <div style={{ marginTop: 22, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
        <label className="field" style={{ maxWidth: 260 }}>
          <span>Final invoice value</span>
          <input type="number" min="0" step="0.01" value={finalValue} onChange={(event) => setFinalValue(event.target.value)} />
        </label>
        <p className="auth-copy" style={{ margin: "8px 0 12px" }}>If this matches the accepted estimate, Ziepher carries the estimate line-item breakdown into the invoice. If it changed, the invoice records the final completed-service amount.</p>
        <button className="button primary" disabled={!!busy} onClick={() => run("complete")}>{busy === "complete" ? "Completing…" : "Complete job & create invoice"}</button>
      </div>

      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
    </section>
  );
}
