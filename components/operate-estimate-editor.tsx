"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Item = { description: string; quantity: number; unitPriceCents: number };

type Props = {
  estimateId: string;
  status: string;
  notes: string;
  taxCents: number;
  discountCents: number;
  validUntil: string | null;
  items: Item[];
};

function dollars(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function OperateEstimateEditor(props: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(props.items.length ? props.items : [{ description: "", quantity: 1, unitPriceCents: 0 }]);
  const [notes, setNotes] = useState(props.notes);
  const [taxCents, setTaxCents] = useState(props.taxCents);
  const [discountCents, setDiscountCents] = useState(props.discountCents);
  const [validUntil, setValidUntil] = useState(props.validUntil ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const locked = ["accepted", "declined", "expired", "canceled"].includes(props.status);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0), [items]);
  const total = Math.max(0, subtotal + taxCents - discountCents);

  function updateItem(index: number, patch: Partial<Item>) {
    setSaved(false);
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  async function save() {
    setError(null);
    setSaved(false);
    const response = await fetch(`/api/operate/estimates/${props.estimateId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes, taxCents, discountCents, validUntil: validUntil || null, items })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error ?? "Unable to save estimate.");
    setSaved(true);
    router.refresh();
  }

  function saveEstimate() {
    startTransition(async () => {
      try { await save(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save estimate."); }
    });
  }

  function acceptEstimate() {
    startTransition(async () => {
      try {
        await save();
        const response = await fetch(`/api/operate/estimates/${props.estimateId}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "accept" })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error ?? "Unable to accept estimate.");
        router.push(`/operate/jobs/${body.jobId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to accept estimate.");
      }
    });
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <p className="panel-label">Estimate editor</p>
          <h2 style={{ margin: "6px 0 0" }}>Price the work</h2>
        </div>
        <span className="status-pill">{props.status.replaceAll("_", " ")}</span>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        {items.map((item, index) => (
          <div key={index} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 120px 160px auto", gap: 10, alignItems: "end" }}>
            <label className="field"><span>Description</span><input disabled={locked} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} placeholder="Tree removal, trimming, stump grinding…" /></label>
            <label className="field"><span>Qty</span><input disabled={locked} type="number" min="0.001" step="0.001" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })} /></label>
            <label className="field"><span>Unit price</span><input disabled={locked} type="number" min="0" step="0.01" value={(item.unitPriceCents / 100).toFixed(2)} onChange={(e) => updateItem(index, { unitPriceCents: Math.round((Number(e.target.value) || 0) * 100) })} /></label>
            {!locked ? <button className="button" type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>Remove</button> : null}
          </div>
        ))}
      </div>

      {!locked ? <button className="button" style={{ marginTop: 12 }} type="button" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, unitPriceCents: 0 }])}>Add line item</button> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 22 }}>
        <label className="field"><span>Tax</span><input disabled={locked} type="number" min="0" step="0.01" value={(taxCents / 100).toFixed(2)} onChange={(e) => setTaxCents(Math.round((Number(e.target.value) || 0) * 100))} /></label>
        <label className="field"><span>Discount</span><input disabled={locked} type="number" min="0" step="0.01" value={(discountCents / 100).toFixed(2)} onChange={(e) => setDiscountCents(Math.round((Number(e.target.value) || 0) * 100))} /></label>
        <label className="field"><span>Valid until</span><input disabled={locked} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
      </div>

      <label className="field" style={{ marginTop: 14 }}><span>Estimate notes</span><textarea disabled={locked} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>

      <div style={{ marginTop: 22, display: "grid", gap: 6, justifyContent: "end", textAlign: "right" }}>
        <div>Subtotal: <strong>{dollars(subtotal)}</strong></div>
        <div>Tax: <strong>{dollars(taxCents)}</strong></div>
        <div>Discount: <strong>-{dollars(discountCents)}</strong></div>
        <div style={{ fontSize: 24 }}>Total: <strong>{dollars(total)}</strong></div>
      </div>

      {error ? <p style={{ color: "#ffb199", marginTop: 14 }}>{error}</p> : null}
      {saved ? <p className="auth-copy" style={{ marginTop: 14 }}>Saved.</p> : null}

      {!locked ? <div className="inline-actions" style={{ marginTop: 18 }}>
        <button className="button" disabled={pending} onClick={saveEstimate} type="button">{pending ? "Working…" : "Save estimate"}</button>
        <button className="button primary" disabled={pending || total <= 0} onClick={acceptEstimate} type="button">Mark accepted & create job</button>
      </div> : null}
    </section>
  );
}
