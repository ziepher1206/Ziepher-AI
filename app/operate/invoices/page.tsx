import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function money(cents: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

export default async function OperateInvoicesPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id,invoice_number,status,total_cents,balance_due_cents,due_date,created_at,customers(display_name),jobs(title)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">INVOICES</div></div></div>
        <div className="inline-actions"><Link className="button" href="/operate">Dashboard</Link><Link className="button" href="/operate/calendar">Calendar</Link></div>
      </header>

      <section className="auth-card" style={{ maxWidth: 1000 }}>
        <p className="panel-label">Operate</p>
        <h1 style={{ margin: "6px 0 8px" }}>Invoices</h1>
        <p className="auth-copy" style={{ marginTop: 0 }}>Invoices generated from completed work, including current balances and payment status.</p>
        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {(invoices ?? []).map((invoice) => {
            const customer = Array.isArray(invoice.customers) ? invoice.customers[0] : invoice.customers;
            const job = Array.isArray(invoice.jobs) ? invoice.jobs[0] : invoice.jobs;
            return (
              <Link key={invoice.id} href={`/operate/invoices/${invoice.id}`} className="project-card" style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                  <div><span className="status-pill">{invoice.invoice_number}</span><h2 style={{ margin: "10px 0 4px" }}>{customer?.display_name ?? "Customer"}</h2><p>{job?.title ?? "Completed service"}</p></div>
                  <span className="status-pill">{invoice.status}</span>
                </div>
                <p><strong>{money(invoice.total_cents)}</strong> total · {money(invoice.balance_due_cents)} due</p>
                <small>{invoice.due_date ? `Due ${invoice.due_date}` : "No due date"}</small>
              </Link>
            );
          })}
          {!invoices?.length ? <p className="auth-copy">No invoices yet. Completing a job creates its draft invoice automatically.</p> : null}
        </div>
      </section>
    </main>
  );
}
