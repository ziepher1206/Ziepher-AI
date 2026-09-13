"use client";

import { useState } from "react";

type Props = {
  workspaceId: string;
  invoiceId: string;
  disabled?: boolean;
};

export function OperateInvoiceCheckout({ workspaceId, invoiceId, disabled = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCheckout() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/workspaces/${workspaceId}/invoices/${invoiceId}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ origin: window.location.origin })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.url) {
      setError(payload?.error ?? "Unable to create Stripe test checkout.");
      setBusy(false);
      return;
    }
    window.location.assign(payload.url);
  }

  return (
    <div>
      <button className="button primary" type="button" disabled={disabled || busy} onClick={createCheckout}>
        {busy ? "Creating test checkout…" : "Open Stripe test checkout"}
      </button>
      <p className="auth-copy" style={{ margin: "8px 0 0" }}>Test mode only. No live customer charge is enabled by this screen.</p>
      {error ? <p className="form-error" style={{ marginTop: 10 }}>{error}</p> : null}
    </div>
  );
}
