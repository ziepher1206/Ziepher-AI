import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function sourceLabel(value: string | null) {
  const raw = value?.trim();
  return raw || "Unknown";
}

type Row = {
  source: string;
  leads: number;
  jobs: number;
  invoicedCents: number;
  collectedCents: number;
};

export default async function OperateAttributionPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const [{ data: leads, error: leadsError }, { data: jobs, error: jobsError }, { data: invoices, error: invoicesError }] = await Promise.all([
    supabase.from("leads").select("id,source,status").eq("workspace_id", workspaceId),
    supabase.from("jobs").select("id,lead_id,status").eq("workspace_id", workspaceId),
    supabase.from("invoices").select("id,job_id,total_cents,paid_cents,status").eq("workspace_id", workspaceId)
  ]);
  if (leadsError) throw leadsError;
  if (jobsError) throw jobsError;
  if (invoicesError) throw invoicesError;

  const sourceByLead = new Map<string, string>();
  const rows = new Map<string, Row>();
  const getRow = (source: string) => {
    const existing = rows.get(source);
    if (existing) return existing;
    const next = { source, leads: 0, jobs: 0, invoicedCents: 0, collectedCents: 0 };
    rows.set(source, next);
    return next;
  };

  for (const lead of leads ?? []) {
    const source = sourceLabel(lead.source);
    sourceByLead.set(lead.id, source);
    getRow(source).leads += 1;
  }

  const sourceByJob = new Map<string, string>();
  for (const job of jobs ?? []) {
    const source = job.lead_id ? sourceByLead.get(job.lead_id) ?? "Unknown" : "Unknown";
    sourceByJob.set(job.id, source);
    getRow(source).jobs += 1;
  }

  for (const invoice of invoices ?? []) {
    const source = invoice.job_id ? sourceByJob.get(invoice.job_id) ?? "Unknown" : "Unknown";
    const row = getRow(source);
    if (invoice.status !== "void") row.invoicedCents += invoice.total_cents ?? 0;
    row.collectedCents += invoice.paid_cents ?? 0;
  }

  const report = Array.from(rows.values()).sort((a, b) => b.leads - a.leads || b.collectedCents - a.collectedCents);
  const totalLeads = report.reduce((sum, row) => sum + row.leads, 0);
  const totalJobs = report.reduce((sum, row) => sum + row.jobs, 0);
  const totalInvoiced = report.reduce((sum, row) => sum + row.invoicedCents, 0);
  const totalCollected = report.reduce((sum, row) => sum + row.collectedCents, 0);

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">ATTRIBUTION</div></div></div>
        <div className="inline-actions"><Link className="button" href="/operate">Dashboard</Link><Link className="button" href="/operate/leads">Leads</Link><Link className="button" href="/operate/invoices">Invoices</Link></div>
      </header>

      <section style={{ display: "grid", gap: 20, maxWidth: 1100 }}>
        <div><p className="panel-label">Tree Service growth</p><h1 style={{ margin: "6px 0 8px" }}>Lead source attribution</h1><p className="auth-copy" style={{ maxWidth: 780, margin: 0 }}>Follow each lead source through booked jobs, invoiced work, and collected revenue. Manual advertising spend and ROI can be layered on after source revenue is trustworthy.</p></div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Leads</p><h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{totalLeads}</h2></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Jobs</p><h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{totalJobs}</h2></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Invoiced</p><h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{money(totalInvoiced)}</h2></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Collected</p><h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{money(totalCollected)}</h2></div>
        </section>

        <section className="auth-card" style={{ maxWidth: "none", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead><tr style={{ textAlign: "left" }}><th style={{ padding: "10px 8px" }}>Source</th><th style={{ padding: "10px 8px" }}>Leads</th><th style={{ padding: "10px 8px" }}>Jobs</th><th style={{ padding: "10px 8px" }}>Lead → job</th><th style={{ padding: "10px 8px" }}>Invoiced</th><th style={{ padding: "10px 8px" }}>Collected</th></tr></thead>
            <tbody>
              {report.map((row) => <tr key={row.source} style={{ borderTop: "1px solid rgba(255,255,255,.09)" }}><td style={{ padding: "12px 8px" }}><strong>{row.source}</strong></td><td style={{ padding: "12px 8px" }}>{row.leads}</td><td style={{ padding: "12px 8px" }}>{row.jobs}</td><td style={{ padding: "12px 8px" }}>{row.leads ? `${Math.round((row.jobs / row.leads) * 100)}%` : "—"}</td><td style={{ padding: "12px 8px" }}>{money(row.invoicedCents)}</td><td style={{ padding: "12px 8px" }}>{money(row.collectedCents)}</td></tr>)}
              {!report.length ? <tr><td colSpan={6} className="auth-copy" style={{ padding: "18px 8px" }}>No attribution data yet. New leads will appear here automatically when they have a source.</td></tr> : null}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
