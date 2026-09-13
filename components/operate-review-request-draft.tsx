"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Draft = {
  id: string;
  status: string;
  subject: string | null;
  message: string;
  review_url: string | null;
} | null;

export function OperateReviewRequestDraft({ jobId, completed, initialDraft }: { jobId: string; completed: boolean; initialDraft: Draft }) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [message, setMessage] = useState(initialDraft?.message ?? "");
  const [status, setStatus] = useState(initialDraft?.status ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function action(actionName: "generate" | "update" | "ready" | "dismiss") {
    setBusy(true);
    setNotice(null);
    const response = await fetch(`/api/operate/jobs/${jobId}/review-draft`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: actionName, ...(actionName === "update" ? { subject, message } : {}) })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setNotice(payload?.error ?? "Unable to update review draft.");
    const next = payload.reviewRequest;
    setSubject(next?.subject ?? "");
    setMessage(next?.message ?? "");
    setStatus(next?.status ?? null);
    setNotice(actionName === "generate" ? "Draft created. Nothing was sent." : actionName === "ready" ? "Marked ready for manual sending. Nothing was sent." : actionName === "dismiss" ? "Draft dismissed." : "Draft saved. Nothing was sent.");
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: 900 }}>
      <p className="panel-label">Follow-up</p>
      <h2 style={{ margin: "6px 0 8px" }}>Review request draft</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Ziepher can prepare the wording after a completed job, but it will not email or text the customer without explicit approval.</p>
      {!completed ? <p className="auth-copy">Complete the job before creating a review request.</p> : !status || status === "dismissed" ? (
        <button className="button primary" disabled={busy} type="button" onClick={() => action("generate")}>{busy ? "Preparing…" : "Prepare review request"}</button>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div><span className="status-pill">{status}</span></div>
          <label className="field"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} /></label>
          <label className="field"><span>Message</span><textarea rows={8} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} /></label>
          <div className="inline-actions">
            <button className="button primary" disabled={busy} type="button" onClick={() => action("update")}>Save draft</button>
            <button className="button" disabled={busy} type="button" onClick={() => action("ready")}>Mark ready</button>
            <button className="button" disabled={busy} type="button" onClick={() => action("dismiss")}>Dismiss</button>
          </div>
        </div>
      )}
      {notice ? <p className="auth-copy" style={{ marginBottom: 0 }}>{notice}</p> : null}
    </section>
  );
}
