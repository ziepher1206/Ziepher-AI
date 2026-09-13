"use client";

import { useState } from "react";

export function OperateEstimateShareLink({ estimateId, disabled }: { estimateId: string; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createLink() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/operate/estimates/${estimateId}/share`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(payload?.error ?? "Unable to create approval link.");
    const next = `${window.location.origin}/estimate/${payload.token}`;
    setLink(next);
    setMessage("Approval link created. Ziepher did not send it anywhere.");
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setMessage("Link copied.");
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <p className="panel-label">Customer approval</p>
      <h2 style={{ margin: "6px 0 8px" }}>Secure estimate link</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Create a private capability link the customer can open to review and accept this estimate. Creating the link does not email, text, or otherwise contact the customer.</p>
      <div className="inline-actions" style={{ marginTop: 14 }}>
        <button className="button primary" disabled={disabled || busy} type="button" onClick={createLink}>{busy ? "Creating…" : disabled ? "Estimate already closed" : link ? "Regenerate link" : "Create approval link"}</button>
        {link ? <button className="button" type="button" onClick={copyLink}>Copy link</button> : null}
      </div>
      {link ? <input readOnly value={link} style={{ width: "100%", marginTop: 12 }} aria-label="Customer approval link" /> : null}
      {message ? <p className="auth-copy" style={{ marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
