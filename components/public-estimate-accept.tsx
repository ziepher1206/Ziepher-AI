"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublicEstimateAccept({ token, disabled }: { token: string; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function accept() {
    if (disabled || busy) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/public/estimates/${token}/accept`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(payload?.error ?? "Unable to accept estimate.");
    setMessage("Estimate accepted. The business can now schedule the work.");
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button className="button primary" type="button" disabled={disabled || busy} onClick={accept}>
        {busy ? "Accepting…" : disabled ? "Estimate accepted" : "Accept estimate"}
      </button>
      {message ? <p className="auth-copy" style={{ margin: 0 }}>{message}</p> : null}
    </div>
  );
}
