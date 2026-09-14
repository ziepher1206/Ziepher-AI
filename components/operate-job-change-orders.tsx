"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ChangeOrder = {
  id: string;
  description: string;
  amount_cents: number;
  status: string;
  approval_method: string | null;
  approved_at: string | null;
  created_at: string;
};

const methods = [
  ["customer_in_person", "Customer approved in person"],
  ["customer_phone", "Customer approved by phone"],
  ["customer_email", "Customer approved by email"],
  ["other", "Other documented approval"]
] as const;

export function OperateJobChangeOrders({ jobId, initialOrders, closed }: { jobId: string; initialOrders: ChangeOrder[]; closed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Math.round(Number(form.get("amount") ?? 0) * 100);
    const approved = form.get("approved") === "on";
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/operate/jobs/${jobId}/change-orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        description: String(form.get("description") ?? ""),
        amountCents: amount,
        approved,
        approvalMethod: approved ? String(form.get("approvalMethod") ?? "customer_in_person") : null
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(payload?.error ?? "Unable to save change order.");
    event.currentTarget.reset();
    setMessage("Change order saved.");
    router.refresh();
  }

  async function update(changeOrderId: string, status: "approved" | "rejected" | "canceled", approvalMethod?: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/operate/jobs/${jobId}/change-orders`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ changeOrderId, status, approvalMethod: status === "approved" ? approvalMethod ?? "customer_in_person" : null })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(payload?.error ?? "Unable to update change order.");
    router.refresh();
  }

  const approvedTotal = initialOrders.filter((order) => order.status === "approved").reduce((sum, order) => sum + order.amount_cents, 0);

  return (
    <section className="auth-card" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
        <div><p className="panel-label">Scope changes</p><h2 style={{ margin: "6px 0 8px" }}>Change orders</h2></div>
        <span className="status-pill">Approved extras ${(approvedTotal / 100).toFixed(2)}</span>
      </div>
      <p className="auth-copy" style={{ marginTop: 0 }}>Record extra work separately from the accepted estimate. Mark approval only when the customer has actually agreed to it.</p>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {initialOrders.map((order) => (
          <article key={order.id} className="project-card" style={{ minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>{order.description}</strong><strong>${(order.amount_cents / 100).toFixed(2)}</strong>
            </div>
            <div className="auth-copy" style={{ marginTop: 6, fontSize: 13 }}>Status: {order.status.replaceAll("_", " ")}{order.approval_method ? ` · ${order.approval_method.replaceAll("_", " ")}` : ""}</div>
            {!closed && order.status === "draft" ? (
              <div className="inline-actions" style={{ marginTop: 10 }}>
                <select id={`approval-${order.id}`} className="button" defaultValue="customer_in_person">{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <button className="button primary" disabled={busy} onClick={() => {
                  const element = document.getElementById(`approval-${order.id}`) as HTMLSelectElement | null;
                  void update(order.id, "approved", element?.value);
                }}>Mark approved</button>
                <button className="button" disabled={busy} onClick={() => void update(order.id, "rejected")}>Reject</button>
              </div>
            ) : null}
          </article>
        ))}
        {!initialOrders.length ? <p className="auth-copy">No change orders recorded.</p> : null}
      </div>

      {!closed ? (
        <form onSubmit={create} style={{ display: "grid", gap: 12, marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <label className="field"><span>Extra work</span><textarea name="description" rows={3} required maxLength={4000} placeholder="Additional limb removal, extra stump, haul-away change, unexpected access work…" /></label>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,220px) minmax(220px,1fr)", gap: 12 }}>
            <label className="field"><span>Amount</span><input name="amount" type="number" min="0" step="0.01" required /></label>
            <label className="field"><span>Approval method</span><select name="approvalMethod" defaultValue="customer_in_person">{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label className="button" style={{ justifyContent: "flex-start" }}><input name="approved" type="checkbox" /> Customer has already approved this change</label>
          <div className="inline-actions"><button className="button primary" disabled={busy} type="submit">{busy ? "Saving…" : "Add change order"}</button>{message ? <span className="auth-copy">{message}</span> : null}</div>
        </form>
      ) : null}
    </section>
  );
}
