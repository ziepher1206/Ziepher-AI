"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { OperateInvoiceCheckout } from "@/components/operate-invoice-checkout";

type Milestone = {
  id: string;
  position: number;
  label: string;
  amountCents: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  refundedAt: string | null;
};

type Props = {
  workspaceId: string;
  invoiceId: string;
  invoiceTotalCents: number;
  invoicePaidCents: number;
  stripeReady: boolean;
  isAdmin: boolean;
  milestones: Milestone[];
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function date(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

function defaultDueDate() {
  const value = new Date();
  value.setDate(value.getDate() + 30);
  return value.toISOString().slice(0, 10);
}

export function OperateInvoicePaymentPlan({
  workspaceId,
  invoiceId,
  invoiceTotalCents,
  invoicePaidCents,
  stripeReady,
  isAdmin,
  milestones
}: Props) {
  const router = useRouter();
  const [deposit, setDeposit] = useState("0.00");
  const [installments, setInstallments] = useState("3");
  const [firstDue, setFirstDue] = useState(defaultDueDate());
  const [intervalDays, setIntervalDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = milestones.filter((item) => item.status !== "canceled");
  const paidPlanCents = active
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const remainingPlanCents = active
    .filter((item) => item.status === "unpaid")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const nextMilestone = active
    .filter((item) => item.status === "unpaid")
    .sort((a, b) => a.position - b.position)[0] ?? null;
  const canCancel = active.length > 0 && active.every((item) => item.status === "unpaid");

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const depositCents = Math.round(Number(deposit) * 100);
    const installmentCount = Number(installments);
    const interval = Number(intervalDays);
    if (!Number.isFinite(depositCents) || depositCents < 0 || !Number.isInteger(installmentCount) || !Number.isInteger(interval)) {
      setError("Enter a valid payment plan.");
      setBusy(false);
      return;
    }

    const response = await fetch(`/api/workspaces/${workspaceId}/invoices/${invoiceId}/milestones`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_plan",
        depositCents,
        installmentCount,
        firstInstallmentDue: firstDue,
        intervalDays: interval
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to create payment plan.");
      return;
    }
    router.refresh();
  }

  async function cancelPlan() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/workspaces/${workspaceId}/invoices/${invoiceId}/milestones`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "cancel_plan" })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to cancel payment plan.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: 940 }}>
      <p className="panel-label">Payment plan</p>
      <h2 style={{ margin: "6px 0 8px" }}>Deposit & installments</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>
        Payment plans are separate from maintenance subscriptions. They stop after the final invoice installment is paid.
      </p>

      {active.length ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginTop: 18 }}>
            <div><small>Invoice total</small><div><strong>{money(invoiceTotalCents)}</strong></div></div>
            <div><small>Paid</small><div><strong>{money(Math.max(invoicePaidCents, paidPlanCents))}</strong></div></div>
            <div><small>Plan remaining</small><div><strong>{money(remainingPlanCents)}</strong></div></div>
            <div><small>Next due</small><div><strong>{nextMilestone ? `${money(nextMilestone.amountCents)} · ${date(nextMilestone.dueDate)}` : "Plan complete"}</strong></div></div>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            {active.map((item) => (
              <article key={item.id} className="project-card" style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>{item.label}</strong>
                    <div className="auth-copy">{date(item.dueDate)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{money(item.amountCents)}</strong>
                    <div><span className="status-pill">{item.status}</span></div>
                  </div>
                </div>
                {item.status === "unpaid" && stripeReady ? (
                  <div style={{ marginTop: 12 }}>
                    <OperateInvoiceCheckout workspaceId={workspaceId} invoiceId={invoiceId} milestoneId={item.id} label={`Pay ${item.label} in Stripe test mode`} />
                  </div>
                ) : null}
                {item.paidAt ? <p className="auth-copy" style={{ marginBottom: 0 }}>Paid {new Date(item.paidAt).toLocaleString()}</p> : null}
                {item.refundedAt ? <p className="auth-copy" style={{ marginBottom: 0 }}>Refunded {new Date(item.refundedAt).toLocaleString()}</p> : null}
              </article>
            ))}
          </div>

          {isAdmin && canCancel ? (
            <button className="button" type="button" disabled={busy} onClick={cancelPlan} style={{ marginTop: 14 }}>
              {busy ? "Updating…" : "Cancel unpaid payment plan"}
            </button>
          ) : null}
        </>
      ) : isAdmin && invoicePaidCents === 0 ? (
        <form onSubmit={createPlan} style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <label className="field"><span>Deposit</span><input type="number" min="0" step="0.01" value={deposit} onChange={(event) => setDeposit(event.target.value)} /></label>
            <label className="field"><span>Installments after deposit</span><input type="number" min="1" max="12" step="1" value={installments} onChange={(event) => setInstallments(event.target.value)} /></label>
            <label className="field"><span>First installment due</span><input type="date" value={firstDue} onChange={(event) => setFirstDue(event.target.value)} /></label>
            <label className="field"><span>Days between installments</span><input type="number" min="1" max="90" step="1" value={intervalDays} onChange={(event) => setIntervalDays(event.target.value)} /></label>
          </div>
          <div className="inline-actions">
            <button className="button primary" disabled={busy} type="submit">{busy ? "Creating…" : "Create payment plan"}</button>
            <span className="auth-copy">Ziepher will split cents exactly so the plan always equals {money(invoiceTotalCents)}.</span>
          </div>
        </form>
      ) : (
        <p className="auth-copy">No payment plan is active for this invoice.</p>
      )}

      {!stripeReady ? <p className="auth-copy" style={{ marginTop: 14 }}>Stripe test payments are not connected or enabled for this workspace yet.</p> : null}
      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
    </section>
  );
}
