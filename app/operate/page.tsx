import Link from "next/link";
import { redirect } from "next/navigation";
import { OperateDailyPriorities } from "@/components/operate-daily-priorities";
import { OperateLeadForm } from "@/components/operate-lead-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function money(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format((cents ?? 0) / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function OperatePage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "ensure_personal_workspace"
  );
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id,name")
    .eq("id", workspaceId)
    .single();

  const [
    { count: newLeadCount },
    { count: activeJobCount },
    { count: pausedJobCount },
    { count: openEstimateCount },
    { count: readyEstimateCount },
    { count: draftInvoiceCount },
    { count: overdueInvoiceCount }
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "new"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["scheduled", "en_route", "arrived", "active", "weather_delay", "paused"]),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["weather_delay", "paused"]),
    supabase.from("estimates").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["draft", "scheduled", "completed", "sent"]),
    supabase.from("estimates").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["completed", "sent"]),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "draft"),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "overdue")
  ]);

  const { data: invoiceRows } = await supabase
    .from("invoices")
    .select("balance_due_cents,status")
    .eq("workspace_id", workspaceId)
    .in("status", ["sent", "partial", "overdue"]);
  const outstandingCents = (invoiceRows ?? []).reduce(
    (sum, invoice) => sum + (invoice.balance_due_cents ?? 0),
    0
  );

  const { data: leads } = await supabase
    .from("leads")
    .select("id,contact_name,phone,email,service_address,status,source,received_at")
    .eq("workspace_id", workspaceId)
    .order("received_at", { ascending: false })
    .limit(8);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id,title,appointment_type,status,starts_at,service_address")
    .eq("workspace_id", workspaceId)
    .gte("starts_at", new Date().toISOString())
    .neq("status", "canceled")
    .order("starts_at", { ascending: true })
    .limit(6);

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER</div>
            <div className="brand-subtitle">RUN · BUILD · GROW</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/operate/leads">Leads</Link>
          <Link className="button" href="/operate/estimates">Estimates</Link>
          <Link className="button" href="/operate/calendar">Calendar</Link>
          <Link className="button" href="/operate/invoices">Invoices</Link>
          <Link className="button" href="/operate/growth">Growth</Link>
          <Link className="button" href="/projects">Websites</Link>
          <Link className="button" href="/settings">Settings</Link>
          <form action="/auth/sign-out" method="post">
            <button className="button">Sign out</button>
          </form>
        </div>
      </header>

      <section style={{ display: "grid", gap: 26 }}>
        <div>
          <p className="panel-label">{workspace?.name ?? "Your business"}</p>
          <h1 style={{ margin: "6px 0 10px" }}>Your business today</h1>
          <p className="auth-copy" style={{ maxWidth: 760, margin: 0 }}>
            Ziepher brings leads, estimates, scheduling, crews, jobs, invoices, payments, websites, and growth into one workspace.
          </p>
        </div>

        <OperateDailyPriorities
          newLeads={newLeadCount ?? 0}
          readyEstimates={readyEstimateCount ?? 0}
          activeJobs={activeJobCount ?? 0}
          pausedJobs={pausedJobCount ?? 0}
          draftInvoices={draftInvoiceCount ?? 0}
          overdueInvoices={overdueInvoiceCount ?? 0}
          outstandingCents={outstandingCents}
        />

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          <Link href="/operate/leads" className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">New leads</p>
            <h2 style={{ fontSize: 34, margin: "8px 0 4px" }}>{newLeadCount ?? 0}</h2>
            <p>Waiting for first contact</p>
          </Link>
          <Link href="/operate/estimates" className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">Open estimates</p>
            <h2 style={{ fontSize: 34, margin: "8px 0 4px" }}>{openEstimateCount ?? 0}</h2>
            <p>Draft through sent</p>
          </Link>
          <Link href="/operate/calendar" className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">Active jobs</p>
            <h2 style={{ fontSize: 34, margin: "8px 0 4px" }}>{activeJobCount ?? 0}</h2>
            <p>Scheduled, traveling, on site, or paused</p>
          </Link>
          <Link href="/operate/invoices" className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">Outstanding</p>
            <h2 style={{ fontSize: 34, margin: "8px 0 4px" }}>{money(outstandingCents)}</h2>
            <p>Open invoice balance</p>
          </Link>
        </section>

        <OperateLeadForm workspaceId={workspaceId} />

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
          <article className="auth-card" style={{ maxWidth: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div>
                <p className="panel-label">Lead inbox</p>
                <h2 style={{ margin: "6px 0 0" }}>Newest requests</h2>
              </div>
              <Link href="/operate/leads" className="status-pill">View all</Link>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {(leads ?? []).map((lead) => (
                <Link href="/operate/leads" key={lead.id} style={{ borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: 12, color: "inherit", textDecoration: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                    <div>
                      <strong>{lead.contact_name}</strong>
                      <div className="auth-copy" style={{ fontSize: 14, marginTop: 4 }}>
                        {lead.phone ?? lead.email ?? "Contact details pending"}
                      </div>
                    </div>
                    <span className="status-pill">{lead.status}</span>
                  </div>
                  <div className="auth-copy" style={{ fontSize: 13, marginTop: 6 }}>
                    {lead.service_address ?? "Address not added"} · {dateTime(lead.received_at)}
                  </div>
                </Link>
              ))}
              {!leads?.length ? <p className="auth-copy">No leads yet. Add the first one above.</p> : null}
            </div>
          </article>

          <article className="auth-card" style={{ maxWidth: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div><p className="panel-label">Schedule</p><h2 style={{ margin: "6px 0 0" }}>Coming up</h2></div>
              <Link href="/operate/calendar" className="status-pill">Open calendar</Link>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {(appointments ?? []).map((appointment) => (
                <Link href="/operate/calendar" key={appointment.id} style={{ borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: 12, color: "inherit", textDecoration: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{appointment.title}</strong>
                    <span className="status-pill">{appointment.appointment_type}</span>
                  </div>
                  <div className="auth-copy" style={{ fontSize: 13, marginTop: 6 }}>
                    {dateTime(appointment.starts_at)}{appointment.service_address ? ` · ${appointment.service_address}` : ""}
                  </div>
                </Link>
              ))}
              {!appointments?.length ? <p className="auth-copy">Nothing scheduled yet.</p> : null}
            </div>
          </article>
        </section>

        <section className="project-grid" style={{ marginTop: 0 }}>
          <Link className="project-card" href="/operate/leads">
            <span className="status-pill">Operate</span>
            <h2>Lead → Estimate → Job</h2>
            <p>Capture work, schedule estimates, price it, accept it, assign the crew, and complete the job in one workflow.</p>
          </Link>
          <Link className="project-card" href="/operate/invoices">
            <span className="status-pill">Payments</span>
            <h2>Invoices</h2>
            <p>Completed jobs create draft invoices with Stripe payment rails kept safely in test mode until live billing is explicitly approved.</p>
          </Link>
          <Link className="project-card" href="/operate/growth">
            <span className="status-pill">Grow</span>
            <h2>Website & Growth</h2>
            <p>Turn completed jobs into reviews, compare lead sources against collected revenue, and prepare approval-gated website and campaign changes.</p>
          </Link>
          <Link className="project-card" href="/projects">
            <span className="status-pill">Create</span>
            <h2>Websites</h2>
            <p>Build, connect, scan, improve, preview, and safely publish business websites.</p>
          </Link>
        </section>
      </section>
    </main>
  );
}
