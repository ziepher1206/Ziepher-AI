"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  projectId: string;
  liveAIAvailable: boolean;
};

export function SiteAnalysisControls({ projectId, liveAIAvailable }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState<"deterministic" | "live" | null>(null);
  const [confirmPaidAI, setConfirmPaidAI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(mode: "deterministic" | "live") {
    if (running) return;
    if (mode === "live" && (!liveAIAvailable || !confirmPaidAI)) return;
    setRunning(mode);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/site-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          confirmPaidAI: mode === "live" ? confirmPaidAI : false
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to create website analysis.");
      if (mode === "live") setConfirmPaidAI(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create website analysis.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="inline-actions">
        <button
          type="button"
          className="button primary"
          onClick={() => void run("deterministic")}
          disabled={Boolean(running)}
        >
          {running === "deterministic" ? "Building report…" : "Build detailed report — free"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => void run("live")}
          disabled={Boolean(running) || !liveAIAvailable || !confirmPaidAI}
          title={liveAIAvailable ? "Uses the configured OpenAI provider within the monthly cap" : "Live AI is not fully configured"}
        >
          {running === "live" ? "Analyzing with AI…" : "Run deep AI analysis"}
        </button>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={confirmPaidAI}
          onChange={(event) => setConfirmPaidAI(event.target.checked)}
          disabled={!liveAIAvailable || Boolean(running)}
        />
        <span className="auth-copy">
          {liveAIAvailable
            ? "I approve provider usage for this one deep-analysis request within the configured monthly cap."
            : "Live AI is locked until the provider, budget, model, output limit, and owner gate are configured. The detailed free report still works without provider credits."}
        </span>
      </label>
      {error ? <p style={{ margin: 0 }}>{error}</p> : null}
    </div>
  );
}
