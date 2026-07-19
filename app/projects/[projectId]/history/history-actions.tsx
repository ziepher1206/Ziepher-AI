"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RestoreVersionButton({
  projectId,
  version
}: {
  projectId: string;
  version: number;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function restore() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/versions/${version}/restore`,
        { method: "POST" }
      );
      const payload = (await response.json()) as {
        version?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to restore version.");
      }
      setMessage(`Restored as version ${payload.version}.`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to restore version."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="history-action">
      <button className="button" disabled={busy} onClick={() => void restore()}>
        {busy ? "Restoring…" : "Restore"}
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
