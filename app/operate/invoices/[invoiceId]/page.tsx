import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OperateInvoiceCheckout } from "@/components/operate-invoice-checkout";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ invoiceId: string }> };

function money(cents: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

export default async function OperateInvoicePage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const { invoiceId } = await params;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id,workspace_id,invoice_number,status,issue_date,due_date,subtotal_cents,tax_cents,discount_cents,total_cents,paid_cents,balance_due_cents,notes,sent_at,paid_at,customers(display_name,email,phone),jobs(id,title)")
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) throw error;
  if (!invoice) notFound();

  const [{ data: items, error: itemsError }, { data: paymentAccount }] = await Promise.all([
    supabase.from("invoice_line_items").select("id,position,description,quantity,unit_price_cents,line_total_cents").eq("invoice_id", invoice.id).eq("workspace_id", invoice.workspace_id).order("position"),
    supabase.from("workspace_payment_accounts").select("provider,charges_enabled,details_submitted").eq("workspace_id", invoice.workspace_id).eq("provider", "stripe").maybeSingle()
  ]);
  if (itemsError) throw itemsError;

  const customer = Array.isArray(invoice.customers) ? invoice.customers[0] : invoice.customers;
  const job = Array.isArray(invoice.jobs) ? invoice.jobs[0] : invoice.jobs;
  const payable = !["paid", "void"].includes(invoice.status) && (invoice.balance_due_cents ?? 0) >= 50;
  const stripeReady = !!paymentAccount?.charges_enabled;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">INVOICE</div></div></div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Dashboard</Link>
          <Link className="button" href="/operate/invoices">Invoices</Link>
          {job?.id ? <Link className="button" href={`/operate/jobs/${job.id}`}>Job</Link> : null}
        </div>
      </header>

      <section className="auth-card" style={{ maxWidth: 940 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <p className="panel-label">{customer?.display_name ?? "Customer"}</p>
            <h1 style={{ margin: "6px 0 6px" }}>{invoice.invoice_number}</h1>
            <p className="auth-copy" style={{ margin: 0 }}>{job?.title ?? "Completed service"}</p>
          </div>
          <span className="status-pill">{invoice.status}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 20 }}>
          <div><small>Issued</small><div><strong>{date(invoice.issue_date)}</strong></div></div>
          <div><small>Due</small><div><strong>{date(invoice.due_date)}</strong></div></div>
          <div><small>Total</small><div><strong>{money(invoice.total_cents)}</strong></div></div>
          <div><small>Balance due</small><div><strong>{money(invoice.balance_due_cents)}</strong></div></div>
        </div>

        <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
          {(items ?? []).map((item) => (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
              <div><strong>{item.description}</strong><div className="auth-copy">{Number(item.quantity)} × {money(item.unit_price_cents)}</div></div>
              <strong>{money(item.line_total_cents ?? Math.round(Number(item.quantity) * item.unit_price_cents))}</strong>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, marginLeft: "auto", maxWidth: 340, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>{money(invoice.subtotal_cents)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax</span><strong>{money(invoice.tax_cents)}</strong></div>
          {invoice.discount_cents > 0 ? <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><strong>-{money(invoice.discount_cents)}</strong></div> : null}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border)" }}><span>Total</span><strong>{money(invoice.total_cents)}</strong></div>
          {invoice.paid_cents > 0 ? <div style={{ display: "flex", justifyContent: "space-between" }}><span>Paid</span><strong>{money(invoice.paid_cents)}</strong></div> : null}
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Balance</span><strong>{money(invoice.balance_due_cents)}</strong></div>
        </div>

        {invoice.notes ? <div style={{ marginTop: 22 }}><strong>Notes</strong><p>{invoice.notes}</p></div> : null}
        <div style={{ marginTop: 24 }}>
          <p className="panel-label">Payment</p>
          {stripeReady ? (
            <OperateInvoiceCheckout workspaceId={invoice.workspace_id} invoiceId={invoice.id} disabled={!payable} />
          ) : (
            <p className="auth-copy">Stripe test payments are not connected or enabled for this workspace yet. The invoice itself is ready and remains safe in draft/test workflow.</p>
          )}
        </div>
      </section>
    </main>
  );
}
