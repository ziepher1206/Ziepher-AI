import Link from "next/link";
import { redirect } from "next/navigation";
import { OperateMarketingSpendForm } from "@/components/operate-marketing-spend-form";
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
  spendCents: number;
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

  const [
    { data: leads, error: leadsError },
    { data: jobs, error: jobsError },
    { data: invoices, error: invoicesError },
    { data: spend, error: spendError }
  ] = await Promise.all([
    supabase.from("leads").select("id,source,status").eq("workspace_id", workspaceId),
    supabase.from("jobs").select("id,lead_id,status").eq("workspace_id", workspaceId),
    supabase.from("invoices").select("id,job_id,total_cents,paid_cents,status").eq("workspace_id", workspaceId),
    supabase.from("marketing_source_spend").select("id,source,period_start,period_end,amount_cents,notes").eq("workspace_id", workspaceId).order("period_end", { ascending: false })
  ]);
  if (leadsError) throw leadsError;
  if (jobsError) throw jobsError;
  if (invoicesError) throw invoicesError;
  if (spendError) throw spendError;

  const sourceByLead = new Map<string, string>();
  const rows = new Map<string, Row>();
  const getRow = (source: string) => {
    const existing = rows.get(source);
    if (existing) return existing;
    const next = { source, leads: 0, jobs: 0, spendCents: 0, invoicedCents: 0, collectedCents: 0 };
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

  for (const entry of spend ?? []) getRow(sourceLabel(entry.source)).spendCents += entry.amount_cents ?? 0;

  const report = Array.from(rows.values()).sort((a, b) => b.leads - a.leads || b.collectedCents - a.collectedCents);
  const sources = Array.from(new Set(["Angi", "Google Business Profile", "Google Ads", "Organic Google", "Ziepher Tech referral", "Facebook", "Direct", "Manual / Offline", "Unknown", ...report.map((row) => row.source)])).sort();
  const totalLeads = report.reduce((sum, row) => sum + row.leads, 0);
  const totalJobs = report.reduce((sum, row) => sum + row.jobs, 0);
  const totalSpend = report.reduce((sum, row) => sum + row.spendCents, 0);
  const totalInvoiced = report.reduce((sum, row) => sum + row.invoicedCents, 0);
  const totalCollected = report.reduce((sum, row) => sum + row.collectedCents, 0);

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">ATTRIBUTION</div></div></div>
        <div className="inline-actions"><Link className="button" href="/operate">Dashboard</Link><Link className="button" href="/operate/leads">Leads</Link><Link className="button" href="/operate/invoices">Invoices</Link></div>
      </header>

      <section style={{ display: "grid", gap: 20, maxWidth: 1200 }}>
        <div><p className="panel-label">Tree Service growth</p><h1 style={{ margin: "6px 0 8px" }}>Lead source attribution</h1><p className="auth-copy" style={{ maxWidth: 820, margin: 0 }}>Follow each source from lead to booked job to real collected revenue, then compare it with manually recorded advertising spend.</p></div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Leads</p><h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{totalLeads}</h2></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Jobs</p><h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{totalJobs}</h2></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Ad spend</p><h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{money(totalSpend)}</h2></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Invoiced</p><h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{money(totalInvoiced)}</h2></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Collected</p><h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{money(totalCollected)}</h2></div>
        </section>

        <OperateMarketingSpendForm workspaceId={workspaceId} sources={sources} />

        <section className="auth-card" style={{ maxWidth: "none", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1040 }}>
            <thead><tr style={{ textAlign: "left" }}><th style={{ padding: "10px 8px" }}>Source</th><th style={{ padding: "10px 8px" }}>Leads</th><th style={{ padding: "10px 8px" }}>Jobs</th><th style={{ padding: "10px 8px" }}>Lead → job</th><th style={{ padding: "10px 8px" }}>Spend</th><th style={{ padding: "10px 8px" }}>CPL</th><th style={{ padding: "10px 8px" }}>Cost / job</th><th style={{ padding: "10px 8px" }}>Collected</th><th style={{ padding: "10px 8px" }}>ROI</th></tr></thead>
            <tbody>
              {report.map((row) => {
                const roi = row.spendCents > 0 ? ((row.collectedCents - row.spendCents) / row.spendCents) * 100 : null;
                return <tr key={row.source} style={{ borderTop: "1px solid rgba(255,255,255,.09)" }}><td style={{ padding: "12px 8px" }}><strong>{row.source}</strong></td><td style={{ padding: "12px 8px" }}>{row.leads}</td><td style={{ padding: "12px 8px" }}>{row.jobs}</td><td style={{ padding: "12px 8px" }}>{row.leads ? `${Math.round((row.jobs / row.leads) * 100)}%` : "—"}</td><td style={{ padding: "12px 8px" }}>{money(row.spendCents)}</td><td style={{ padding: "12px 8px" }}>{row.leads && row.spendCents ? money(Math.round(row.spendCents / row.leads)) : "—"}</td><td style={{ padding: "12px 8px" }}>{row.jobs && row.spendCents ? money(Math.round(row.spendCents / row.jobs)) : "—"}</td><td style={{ padding: "12px 8px" }}>{money(row.collectedCents)}</td><td style={{ padding: "12px 8px" }}>{roi === null ? "—" : `${Math.round(roi)}%`}</td></tr>;
              })}
              {!report.length ? <tr><td colSpan={9} className="auth-copy" style={{ padding: "18px 8px" }}>No attribution data yet. New leads and recorded spend will appear here automatically.</td></tr> : null}
            </tbody>
          </table>
        </section>

        {(spend ?? []).length ? <section className="auth-card" style={{ maxWidth: "none" }}><p className="panel-label">Spend ledger</p><h2 style={{ margin: "6px 0 8px" }}>Recent entries</h2><div style={{ display: "grid", gap: 8 }}>{(spend ?? []).slice(0, 20).map((entry) => <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: 10 }}><div><strong>{entry.source}</strong><div className="auth-copy" style={{ fontSize: 13 }}>{entry.period_start} → {entry.period_end}{entry.notes ? ` · ${entry.notes}` : ""}</div></div><strong>{money(entry.amount_cents)}</strong></div>)}</div></section> : null}
      </section>
    </main>
  );
}
