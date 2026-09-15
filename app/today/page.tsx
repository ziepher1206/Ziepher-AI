import Link from "next/link";
import { redirect } from "next/navigation";

import { completeDailyItemAction } from "@/app/today/actions";
import { ZLifeQuickAdd } from "@/components/zlife-quick-add";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function isOptionalSchemaMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "")
    || error.message?.includes("Could not find the table") === true;
}

function formatWhen(value: string | null) {
  if (!value) return "Any time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

const card: React.CSSProperties = {
  border: "1px solid rgba(78,234,221,.24)",
  borderRadius: 18,
  background: "linear-gradient(145deg,rgba(7,43,46,.84),rgba(3,22,25,.94))",
  boxShadow: "0 18px 55px rgba(0,0,0,.24)"
};

export default async function TodayPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const [leads, appointments, invoices, tasks, maintenance, dailyItems] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "new"),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("starts_at", nowIso).lte("starts_at", next24Hours).neq("status", "canceled"),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "overdue"),
    supabase.from("home_tasks").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).neq("status", "done").neq("status", "cancelled"),
    supabase.from("home_maintenance_items").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).lte("next_due_at", next24Hours),
    supabase
      .from("zlife_daily_items")
      .select("id,source_module,item_kind,title,detail,priority,starts_at,due_at,action_href")
      .eq("workspace_id", workspaceId)
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(12)
  ]);

  for (const result of [leads, appointments, invoices, tasks, maintenance, dailyItems]) {
    if (result.error && !isOptionalSchemaMissing(result.error)) throw result.error;
  }

  const businessReady = !leads.error && !appointments.error && !invoices.error;
  const homeReady = !tasks.error && !maintenance.error;
  const dailyStreamReady = !dailyItems.error;
  const unifiedItems = dailyItems.data ?? [];

  const rows = [
    { label: "Business", value: businessReady ? `${leads.count ?? 0} new leads` : "Not connected", href: "/operate", ready: businessReady },
    { label: "Schedule", value: businessReady ? `${appointments.count ?? 0} in the next 24 hours` : "Not connected", href: "/operate/calendar", ready: businessReady },
    { label: "Bills & payments", value: businessReady ? `${invoices.count ?? 0} overdue business invoices` : "Not connected", href: "/operate/invoices", ready: businessReady },
    { label: "Home & family", value: homeReady ? `${tasks.count ?? 0} open tasks` : "Not connected", href: "/home", ready: homeReady },
    { label: "Home maintenance", value: homeReady ? `${maintenance.count ?? 0} due in the next 24 hours` : "Not connected", href: "/home", ready: homeReady },
    { label: "Family & school", value: "Planned daily context", href: "/dashboard/modules", ready: false },
    { label: "Health", value: "In development", href: "/modules/health", ready: false },
    { label: "Grocery & shopping", value: "Planned daily context", href: "/dashboard/modules", ready: false },
    { label: "Subscriptions due", value: "Planned daily context", href: "/modules/money", ready: false },
    { label: "Errands", value: "Planned daily context", href: "/dashboard/modules", ready: false },
    { label: "Auto & vehicle", value: "In development", href: "/modules/auto", ready: false },
    { label: "Documents", value: "In development", href: "/modules/documents", ready: false }
  ];

  const summaryCards = [
    { value: businessReady ? String(leads.count ?? 0) : "—", label: "New leads", detail: businessReady ? "Business" : "Not connected" },
    { value: businessReady ? String(appointments.count ?? 0) : "—", label: "Next 24 hours", detail: businessReady ? "Appointments" : "Not connected" },
    { value: homeReady ? String(tasks.count ?? 0) : "—", label: "Open home tasks", detail: homeReady ? "Home & Family" : "Not connected" },
    { value: homeReady ? String(maintenance.count ?? 0) : "—", label: "Maintenance due", detail: homeReady ? "Next 24 hours" : "Not connected" },
    { value: businessReady ? String(invoices.count ?? 0) : "—", label: "Overdue payments", detail: businessReady ? "Business invoices" : "Not connected" }
  ];

  return (
    <main style={{ minHeight: "100vh", overflowY: "auto", color: "#f6fffd", background: "radial-gradient(circle at 78% 2%,rgba(56,224,243,.14),transparent 24%),radial-gradient(circle at 12% 20%,rgba(16,217,129,.09),transparent 28%),linear-gradient(180deg,#02090b,#041315 52%,#02090b)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 18px 70px" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(78,234,221,.16)", background: "rgba(2,9,11,.88)", backdropFilter: "blur(18px)" }}>
          <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="brand"><div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112" }}>Z</div><div><div className="brand-title">Z <span style={{ color: "#38e0f3" }}>⌁</span> LIFE</div><div className="brand-subtitle">MY DAY</div></div></div>
          </Link>
          <div className="inline-actions"><Link className="button" href="/dashboard">Home</Link><Link className="button" href="/assistant">Ask Z-Life</Link></div>
        </header>

        <section style={{ ...card, marginTop: 22, padding: "32px clamp(22px,4vw,48px)", background: "linear-gradient(120deg,rgba(2,15,18,.96),rgba(7,45,47,.78)),radial-gradient(circle at 84% 20%,rgba(56,224,243,.20),transparent 28%)" }}>
          <p style={{ margin: 0, color: "#7fffd4", fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase" }}>Today at a glance</p>
          <h1 style={{ margin: "10px 0", fontSize: "clamp(40px,5vw,64px)", lineHeight: .98, letterSpacing: "-.045em" }}>What needs your attention<br /><span style={{ color: "#38e0f3" }}>in one readable place.</span></h1>
          <p style={{ maxWidth: 820, margin: 0, color: "#b0cac7", lineHeight: 1.65 }}>This page only shows live totals when the relevant Z-Life area is actually connected. Planned modules stay labeled as planned instead of filling your day with fake information.</p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginTop: 16 }}>
          {summaryCards.map(({ value, label, detail }) => (
            <article key={label} style={{ ...card, padding: 18 }}><p style={{ margin: 0, color: "#9dbbb7", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</p><strong style={{ display: "block", marginTop: 8, fontSize: 28 }}>{value}</strong><small style={{ color: "#789b97" }}>{detail}</small></article>
          ))}
        </section>

        {dailyStreamReady ? <div style={{ marginTop: 16 }}><ZLifeQuickAdd /></div> : null}

        {dailyStreamReady && unifiedItems.length ? (
          <section style={{ ...card, marginTop: 16, padding: 22 }}>
            <div style={{ marginBottom: 16 }}><p className="panel-label" style={{ color: "#7fffd4" }}>Unified daily stream</p><h2 style={{ margin: "4px 0 5px" }}>Coming up across connected modules</h2><p style={{ margin: 0, color: "#789b97", fontSize: 13 }}>Modules keep their own full records. My Day only receives the small amount of context needed to surface what deserves attention and route you back to the source.</p></div>
            <div style={{ display: "grid", gap: 10 }}>
              {unifiedItems.map((item) => (
                <article key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 14, padding: 14, border: `1px solid ${item.priority === "urgent" || item.priority === "high" ? "rgba(255,213,106,.26)" : "rgba(127,255,212,.14)"}`, borderRadius: 14, background: "rgba(255,255,255,.022)" }}>
                  <Link href={item.action_href || "/assistant"} style={{ minWidth: 0, color: "inherit", textDecoration: "none" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 7 }}><span className="status-pill" style={{ color: "#7fffd4" }}>{item.item_kind.replaceAll("_", " ")}</span><span className="status-pill">{item.source_module}</span>{item.priority !== "normal" ? <span className="status-pill" style={{ color: item.priority === "urgent" ? "#ffd56a" : "#b8d2cf" }}>{item.priority}</span> : null}</div>
                    <strong style={{ display: "block" }}>{item.title}</strong>{item.detail ? <p style={{ margin: "5px 0 0", color: "#8faaa7", fontSize: 13, lineHeight: 1.45 }}>{item.detail}</p> : null}
                  </Link>
                  <div style={{ display: "grid", alignContent: "start", justifyItems: "end", gap: 8 }}>
                    <span style={{ color: "#9dbbb7", fontSize: 12, textAlign: "right", whiteSpace: "nowrap" }}>{formatWhen(item.due_at || item.starts_at)}</span>
                    {item.source_module === "zlife_core" ? (
                      <form action={completeDailyItemAction}>
                        <input type="hidden" name="dailyItemId" value={item.id} />
                        <button className="button" type="submit" style={{ padding: "6px 9px", fontSize: 10 }}>Done</button>
                      </form>
                    ) : <small style={{ color: "#789b97", fontSize: 10 }}>Open source to complete</small>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section style={{ ...card, marginTop: 16, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}><div><p className="panel-label" style={{ color: "#38e0f3" }}>Your day</p><h2 style={{ margin: "4px 0 0" }}>Life and business together</h2></div><Link href="/assistant" style={{ color: "#7fffd4", textDecoration: "none", fontSize: 13 }}>Ask Z-Life to help prioritize →</Link></div>
          <div style={{ display: "grid", gap: 9 }}>
            {rows.map((row) => (
              <Link key={row.label} href={row.href} style={{ color: "inherit", textDecoration: "none", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: 14, border: `1px solid ${row.ready ? "rgba(127,255,212,.18)" : "rgba(255,255,255,.055)"}`, borderRadius: 13, background: row.ready ? "rgba(16,217,129,.025)" : "rgba(255,255,255,.02)" }}>
                <strong style={{ fontSize: 14 }}>{row.label}</strong><span style={{ color: row.ready ? "#7fffd4" : "#789b97", fontSize: 12, textAlign: "right" }}>{row.value}</span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ ...card, marginTop: 16, padding: 24, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 18, alignItems: "center" }}>
          <div><p className="panel-label" style={{ color: "#7fffd4" }}>End of day</p><h2 style={{ margin: "4px 0 7px" }}>Review what changed. Plan tomorrow.</h2><p style={{ margin: 0, color: "#8faaa7", lineHeight: 1.55 }}>Use the central Z-Life entry point to work across multiple areas without opening every module one by one.</p></div>
          <Link className="button primary" href="/assistant" style={{ textDecoration: "none", whiteSpace: "nowrap", background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 }}>Open Ask Z-Life</Link>
        </section>
      </div>
    </main>
  );
}
