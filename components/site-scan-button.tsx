"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SiteScanButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scan() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/scan`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Unable to scan website.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to scan website.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button className="button primary" type="button" disabled={busy} onClick={scan}>
        {busy ? "Scanning website…" : "Scan website"}
      </button>
      {error ? <div className="auth-message">{error}</div> : null}
    </div>
  );
}
