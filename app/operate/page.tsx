import Link from "next/link";
import { redirect } from "next/navigation";
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

  const { count: newLeadCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "new");

  const { count: activeJobCount } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("status", ["scheduled", "active", "paused"]);

  const { count: openEstimateCount } = await supabase
    .from("estimates")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("status", ["draft", "scheduled", "completed", "sent"]);

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

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          <article className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">New leads</p>
            <h2 style={{ fontSize: 34, margin: "8px 0 4px" }}>{newLeadCount ?? 0}</h2>
            <p>Waiting for first contact</p>
          </article>
          <article className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">Open estimates</p>
            <h2 style={{ fontSize: 34, margin: "8px 0 4px" }}>{openEstimateCount ?? 0}</h2>
            <p>Draft through sent</p>
          </article>
          <article className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">Active jobs</p>
            <h2 style={{ fontSize: 34, margin: "8px 0 4px" }}>{activeJobCount ?? 0}</h2>
            <p>Scheduled or in progress</p>
          </article>
          <article className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">Outstanding</p>
            <h2 style={{ fontSize: 34, margin: "8px 0 4px" }}>{money(outstandingCents)}</h2>
            <p>Open invoice balance</p>
          </article>
        </section>

        <OperateLeadForm workspaceId={workspaceId} />

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
          <article className="auth-card" style={{ maxWidth: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div>
                <p className="panel-label">Lead inbox</p>
                <h2 style={{ margin: "6px 0 0" }}>Newest requests</h2>
              </div>
              <span className="status-pill">{leads?.length ?? 0} shown</span>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {(leads ?? []).map((lead) => (
                <div key={lead.id} style={{ borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: 12 }}>
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
                </div>
              ))}
              {!leads?.length ? <p className="auth-copy">No leads yet. Add the first one above.</p> : null}
            </div>
          </article>

          <article className="auth-card" style={{ maxWidth: "none" }}>
            <p className="panel-label">Schedule</p>
            <h2 style={{ margin: "6px 0 0" }}>Coming up</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {(appointments ?? []).map((appointment) => (
                <div key={appointment.id} style={{ borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{appointment.title}</strong>
                    <span className="status-pill">{appointment.appointment_type}</span>
                  </div>
                  <div className="auth-copy" style={{ fontSize: 13, marginTop: 6 }}>
                    {dateTime(appointment.starts_at)}{appointment.service_address ? ` · ${appointment.service_address}` : ""}
                  </div>
                </div>
              ))}
              {!appointments?.length ? <p className="auth-copy">Nothing scheduled yet.</p> : null}
            </div>
          </article>
        </section>

        <section className="project-grid" style={{ marginTop: 0 }}>
          <Link className="project-card" href="/projects">
            <span className="status-pill">Create & Grow</span>
            <h2>Websites</h2>
            <p>Build, connect, scan, improve, preview, and safely publish business websites.</p>
          </Link>
          <article className="project-card">
            <span className="status-pill">Operate</span>
            <h2>Estimates → Jobs → Payments</h2>
            <p>The data foundation is active. Customer-facing workflow screens are the next build slice.</p>
          </article>
          <article className="project-card">
            <span className="status-pill">Ziepher AI</span>
            <h2>Assistant</h2>
            <p>Next, the assistant will summarize what needs attention using this live operational data.</p>
          </article>
        </section>
      </section>
    </main>
  );
}
