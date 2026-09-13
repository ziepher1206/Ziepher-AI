"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OperateMarketingSpendForm({ workspaceId, sources }: { workspaceId: string; sources: string[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [source, setSource] = useState(sources[0] ?? "Google Ads");
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(today);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars < 0) return setMessage("Enter a valid spend amount.");
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/operate/attribution/spend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, source, periodStart: start, periodEnd: end, amountCents: Math.round(dollars * 100), notes })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(payload?.error ?? "Unable to record marketing spend.");
    setAmount("");
    setNotes("");
    setMessage("Marketing spend recorded.");
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <p className="panel-label">Manual spend</p>
      <h2 style={{ margin: "6px 0 8px" }}>Record advertising cost</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>This only records what you already spent. Ziepher does not connect to, purchase, or change any advertising.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <label className="field"><span>Source</span><input list="marketing-sources" value={source} onChange={(e) => setSource(e.target.value)} maxLength={120} required /><datalist id="marketing-sources">{sources.map((value) => <option key={value} value={value} />)}</datalist></label>
          <label className="field"><span>Period start</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></label>
          <label className="field"><span>Period end</span><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required /></label>
          <label className="field"><span>Amount spent ($)</span><input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
        </div>
        <label className="field"><span>Notes (optional)</span><input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Facebook fall campaign, Angi monthly bill…" /></label>
        <div className="inline-actions"><button className="button primary" disabled={busy} type="submit">{busy ? "Saving…" : "Record spend"}</button>{message ? <span className="auth-copy">{message}</span> : null}</div>
      </form>
    </section>
  );
}
