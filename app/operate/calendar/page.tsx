import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function OperateCalendarPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id,title,appointment_type,status,starts_at,ends_at,service_address:properties(address_line_1),crews(name),jobs(id),estimates(id),customers(display_name)")
    .eq("workspace_id", workspaceId)
    .in("status", ["tentative", "confirmed", "in_progress"])
    .order("starts_at", { ascending: true })
    .limit(100);
  if (error) throw error;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">CALENDAR</div></div></div>
        <div className="inline-actions"><Link className="button" href="/operate">Dashboard</Link><Link className="button" href="/operate/leads">Leads</Link><Link className="button" href="/operate/estimates">Estimates</Link></div>
      </header>
      <section className="auth-card" style={{ maxWidth: 1000 }}>
        <p className="panel-label">Operate</p>
        <h1 style={{ margin: "6px 0 8px" }}>Schedule</h1>
        <p className="auth-copy" style={{ marginTop: 0 }}>Active estimate appointments and jobs across the business.</p>
        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {(appointments ?? []).map((appointment) => {
            const customer = Array.isArray(appointment.customers) ? appointment.customers[0] : appointment.customers;
            const crew = Array.isArray(appointment.crews) ? appointment.crews[0] : appointment.crews;
            const job = Array.isArray(appointment.jobs) ? appointment.jobs[0] : appointment.jobs;
            const estimate = Array.isArray(appointment.estimates) ? appointment.estimates[0] : appointment.estimates;
            const property = Array.isArray(appointment.service_address) ? appointment.service_address[0] : appointment.service_address;
            const href = job?.id ? `/operate/jobs/${job.id}` : estimate?.id ? `/operate/estimates/${estimate.id}` : "/operate";
            return (
              <Link key={appointment.id} href={href} className="project-card" style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                  <div><span className="status-pill">{appointment.appointment_type}</span><h2 style={{ margin: "10px 0 4px" }}>{appointment.title}</h2><p>{customer?.display_name ?? "Customer"}</p></div>
                  <span className="status-pill">{appointment.status}</span>
                </div>
                <p>{dateTime(appointment.starts_at)} → {dateTime(appointment.ends_at)}</p>
                <small>{crew?.name ? `Crew: ${crew.name}` : "No crew assigned"}{property?.address_line_1 ? ` · ${property.address_line_1}` : ""}</small>
              </Link>
            );
          })}
          {!appointments?.length ? <p className="auth-copy">Nothing is currently scheduled.</p> : null}
        </div>
      </section>
    </main>
  );
}
