import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type CalendarDay = {
  key: string;
  label: string;
  weekday: number;
};

function relation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function localDateKey(value: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function timeOnly(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function shortLocalTime(value: string) {
  const [hourText, minuteText] = value.slice(0, 5).split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized}:${minuteText} ${suffix}`;
}

function buildDays(timezone: string): CalendarDay[] {
  const now = new Date();
  const currentParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(now);
  const year = Number(currentParts.find((part) => part.type === "year")?.value);
  const month = Number(currentParts.find((part) => part.type === "month")?.value);
  const day = Number(currentParts.find((part) => part.type === "day")?.value);
  const base = new Date(Date.UTC(year, month - 1, day));

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(date);
    return { key, label, weekday: date.getUTCDay() };
  });
}

export default async function OperateCalendarPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const [
    { data: workspace, error: workspaceDetailsError },
    { data: appointments, error: appointmentsError },
    { data: crews, error: crewsError },
    { data: availabilityRules, error: availabilityError },
    { data: overrides, error: overridesError }
  ] = await Promise.all([
    supabase.from("workspaces").select("id,timezone").eq("id", workspaceId).single(),
    supabase
      .from("appointments")
      .select("id,title,appointment_type,status,starts_at,ends_at,service_address:properties(address_line_1),crews(id,name),jobs(id),estimates(id),customers(display_name)")
      .eq("workspace_id", workspaceId)
      .in("status", ["tentative", "confirmed", "in_progress"])
      .gte("ends_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(250),
    supabase
      .from("crews")
      .select("id,name,active")
      .eq("workspace_id", workspaceId)
      .order("active", { ascending: false })
      .order("name"),
    supabase
      .from("availability_rules")
      .select("id,resource_crew_id,day_of_week,starts_at_local,ends_at_local,effective_from,effective_until,active")
      .eq("workspace_id", workspaceId)
      .eq("resource_type", "crew")
      .eq("active", true),
    supabase
      .from("schedule_overrides")
      .select("id,resource_type,resource_crew_id,mode,starts_at,ends_at,note,crews(name)")
      .eq("workspace_id", workspaceId)
      .gte("ends_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(200)
  ]);

  if (workspaceDetailsError) throw workspaceDetailsError;
  if (appointmentsError) throw appointmentsError;
  if (crewsError) throw crewsError;
  if (availabilityError) throw availabilityError;
  if (overridesError) throw overridesError;

  const timezone = workspace?.timezone ?? "America/New_York";
  const days = buildDays(timezone);
  const activeCrews = (crews ?? []).filter((crew) => crew.active);

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">CALENDAR</div></div></div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Dashboard</Link>
          <Link className="button" href="/operate/setup">Business setup</Link>
          <Link className="button" href="/operate/leads">Leads</Link>
          <Link className="button" href="/operate/estimates">Estimates</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 18, maxWidth: 1180 }}>
        <div>
          <p className="panel-label">Tree Service</p>
          <h1 style={{ margin: "6px 0 8px" }}>14-day operations calendar</h1>
          <p className="auth-copy" style={{ maxWidth: 820, margin: 0 }}>
            Jobs, estimate appointments, normal crew hours, blocked periods, and special openings in one view. Times use {timezone.replaceAll("_", " ")}.
          </p>
        </div>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="status-pill">Job</span>
            <span className="status-pill">Estimate</span>
            <span className="status-pill">Working hours</span>
            <span className="status-pill">Blocked</span>
            <span className="status-pill">Special opening</span>
          </div>
        </section>

        <div style={{ display: "grid", gap: 14 }}>
          {days.map((day) => {
            const dayAppointments = (appointments ?? []).filter((appointment) => localDateKey(appointment.starts_at, timezone) === day.key);
            const dayOverrides = (overrides ?? []).filter((override) => {
              const startKey = localDateKey(override.starts_at, timezone);
              const endKey = localDateKey(new Date(new Date(override.ends_at).getTime() - 1), timezone);
              return day.key >= startKey && day.key <= endKey;
            });
            const crewHours = activeCrews.map((crew) => {
              const rule = (availabilityRules ?? []).find((item) =>
                item.resource_crew_id === crew.id &&
                item.day_of_week === day.weekday &&
                (!item.effective_from || item.effective_from <= day.key) &&
                (!item.effective_until || item.effective_until >= day.key)
              );
              return { crew, rule };
            });

            return (
              <section key={day.key} className="auth-card" style={{ maxWidth: "none", display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <p className="panel-label" style={{ marginBottom: 4 }}>{day.key}</p>
                    <h2 style={{ margin: 0 }}>{day.label}</h2>
                  </div>
                  <span className="status-pill">{dayAppointments.length} scheduled</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
                  {crewHours.map(({ crew, rule }) => (
                    <div key={crew.id} className="project-card" style={{ minHeight: 0, padding: 14 }}>
                      <strong>{crew.name}</strong>
                      <p className="auth-copy" style={{ margin: "6px 0 0" }}>
                        {rule ? `${shortLocalTime(rule.starts_at_local)}–${shortLocalTime(rule.ends_at_local)}` : "No normal hours"}
                      </p>
                    </div>
                  ))}
                  {!activeCrews.length ? <p className="auth-copy">No active crews. Configure crews in Business setup.</p> : null}
                </div>

                {dayOverrides.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {dayOverrides.map((override) => {
                      const crew = relation(override.crews);
                      return (
                        <div key={override.id} className="project-card" style={{ minHeight: 0, padding: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <strong>{override.mode === "block" ? "Blocked" : "Special opening"}</strong>
                            <span className="status-pill">{override.resource_type === "workspace" ? "Whole business" : crew?.name ?? "Crew"}</span>
                          </div>
                          <p className="auth-copy" style={{ margin: "6px 0 0" }}>
                            {timeOnly(override.starts_at, timezone)}–{timeOnly(override.ends_at, timezone)}{override.note ? ` · ${override.note}` : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: 10 }}>
                  {dayAppointments.map((appointment) => {
                    const customer = relation(appointment.customers);
                    const crew = relation(appointment.crews);
                    const job = relation(appointment.jobs);
                    const estimate = relation(appointment.estimates);
                    const property = relation(appointment.service_address);
                    const href = job?.id ? `/operate/jobs/${job.id}` : estimate?.id ? `/operate/estimates/${estimate.id}` : "/operate";
                    return (
                      <Link key={appointment.id} href={href} className="project-card" style={{ minHeight: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                          <div>
                            <span className="status-pill">{appointment.appointment_type}</span>
                            <h3 style={{ margin: "10px 0 4px" }}>{appointment.title}</h3>
                            <p className="auth-copy" style={{ margin: 0 }}>{customer?.display_name ?? "Customer"}</p>
                          </div>
                          <span className="status-pill">{appointment.status}</span>
                        </div>
                        <p style={{ marginBottom: 6 }}>{timeOnly(appointment.starts_at, timezone)} → {timeOnly(appointment.ends_at, timezone)}</p>
                        <small>{crew?.name ? `Crew: ${crew.name}` : "No crew assigned"}{property?.address_line_1 ? ` · ${property.address_line_1}` : ""}</small>
                      </Link>
                    );
                  })}
                  {!dayAppointments.length ? <p className="auth-copy" style={{ margin: 0 }}>No estimates or jobs scheduled.</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
