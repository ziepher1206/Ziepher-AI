import Link from "next/link";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function isMissingModuleSchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("Could not find the table") === true;
}

function isOptionalSchemaMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "")
    || error.message?.includes("Could not find the table") === true;
}

const shell: React.CSSProperties = {
  minHeight: "100vh",
  overflowY: "auto",
  background:
    "radial-gradient(circle at 74% 4%, rgba(20,224,209,.16), transparent 24%), radial-gradient(circle at 12% 18%, rgba(16,217,129,.10), transparent 28%), linear-gradient(180deg,#02090b 0%,#041315 48%,#02090b 100%)",
  color: "#f6fffd"
};

const card: React.CSSProperties = {
  border: "1px solid rgba(78,234,221,.24)",
  borderRadius: 18,
  background: "linear-gradient(145deg,rgba(7,43,46,.84),rgba(3,22,25,.94))",
  boxShadow: "0 18px 55px rgba(0,0,0,.24)"
};

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id,name")
    .eq("id", workspaceId)
    .single();

  const installations = await supabase
    .from("workspace_module_installations")
    .select("module_key,installed_at,zlife_module_catalog(module_key,name,description,route,category,status)")
    .eq("workspace_id", workspaceId)
    .order("installed_at", { ascending: true });

  if (isMissingModuleSchema(installations.error)) {
    return (
      <main style={shell}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 18px 60px" }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, marginBottom: 32 }}>
            <div className="brand">
              <div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112" }}>Z</div>
              <div><div className="brand-title">Z ⌁ LIFE</div><div className="brand-subtitle">YOUR OPERATING SYSTEM</div></div>
            </div>
            <Link className="button" href="/">Home</Link>
          </header>
          <section style={{ ...card, maxWidth: 900, padding: 28 }}>
            <p className="panel-label" style={{ color: "#38e0f3" }}>Modular dashboard readiness</p>
            <h1 style={{ margin: "6px 0 10px" }}>Your Z-Life dashboard is ready in code.</h1>
            <p className="auth-copy">This environment still needs the workspace module installation migration before Z-Life can save which modules you chose. Until that migration is applied, Z-Life will not pretend module selections are persisted.</p>
            <p className="auth-copy"><code>20260915111000_workspace_module_installations.sql</code></p>
          </section>
        </div>
      </main>
    );
  }

  if (installations.error) throw installations.error;

  const modules = (installations.data ?? [])
    .map((row) => {
      const catalog = Array.isArray(row.zlife_module_catalog) ? row.zlife_module_catalog[0] : row.zlife_module_catalog;
      return catalog && catalog.status !== "hidden" && catalog.status !== "retired" ? catalog : null;
    })
    .filter(Boolean) as Array<{ module_key: string; name: string; description: string; route: string; category: string; status: string }>;

  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();
  const [newLeadsResult, appointmentsResult, overdueInvoicesResult, homeTasksResult, maintenanceResult] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "new"),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("starts_at", nowIso).lte("starts_at", next24Hours).neq("status", "canceled"),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "overdue"),
    supabase.from("home_tasks").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).neq("status", "done").neq("status", "cancelled"),
    supabase.from("home_maintenance_items").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).lte("next_due_at", next24Hours)
  ]);

  for (const result of [newLeadsResult, appointmentsResult, overdueInvoicesResult]) {
    if (result.error && !isOptionalSchemaMissing(result.error)) throw result.error;
  }
  for (const result of [homeTasksResult, maintenanceResult]) {
    if (result.error && !isOptionalSchemaMissing(result.error)) throw result.error;
  }

  const newLeads = newLeadsResult.count ?? 0;
  const upcomingAppointments = appointmentsResult.count ?? 0;
  const overdueInvoices = overdueInvoicesResult.count ?? 0;
  const openHomeTasks = homeTasksResult.count ?? 0;
  const dueMaintenance = maintenanceResult.count ?? 0;
  const homeDataReady = !homeTasksResult.error && !maintenanceResult.error;
  const businessDataReady = !newLeadsResult.error && !appointmentsResult.error && !overdueInvoicesResult.error;

  const todayRows = [
    { label: "Life & personal", value: homeDataReady ? String(openHomeTasks) : "Connect", detail: homeDataReady ? "open household tasks" : "Add Home & Family", href: "/home" },
    { label: "Business", value: businessDataReady ? String(newLeads) : "Connect", detail: businessDataReady ? "new leads" : "Open Business", href: "/operate" },
    { label: "Schedule", value: businessDataReady ? String(upcomingAppointments) : "—", detail: "next 24 hours", href: "/operate/calendar" },
    { label: "Home maintenance", value: homeDataReady ? String(dueMaintenance) : "—", detail: "due in next 24 hours", href: "/home" },
    { label: "Bills & payments", value: businessDataReady ? String(overdueInvoices) : "—", detail: "overdue business invoices", href: "/operate/invoices" },
    { label: "Health", value: "Connect", detail: "module in development", href: "/modules/health" },
    { label: "Grocery & shopping", value: "Connect", detail: "future daily context", href: "/dashboard/modules" },
    { label: "Auto & vehicle", value: "Connect", detail: "module in development", href: "/modules/auto" },
    { label: "Documents", value: "Connect", detail: "module in development", href: "/modules/documents" },
    { label: "End of day", value: "Ask AI", detail: "review and plan tomorrow", href: "/assistant" }
  ];

  const previewModules = modules.slice(0, 8);
  const firstName = user.email?.split("@")[0]?.split(/[._-]/)[0] ?? "there";

  const summaryCards = [
    [String(modules.length), "Active modules", "Connected to your Z-Life"],
    [businessDataReady ? String(upcomingAppointments) : "—", "Next 24 hours", businessDataReady ? "Scheduled appointments" : "Business not connected"],
    [businessDataReady ? String(newLeads) : "—", "Business attention", businessDataReady ? "New leads waiting" : "Business not connected"],
    [homeDataReady ? String(openHomeTasks) : "—", "Home attention", homeDataReady ? "Open household tasks" : "Home module data not connected"]
  ];

  return (
    <main style={shell}>
      <div style={{ maxWidth: 1480, margin: "0 auto", padding: "0 18px 70px" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(78,234,221,.16)", background: "rgba(2,9,11,.88)", backdropFilter: "blur(18px)" }}>
          <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="brand">
              <div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", boxShadow: "0 8px 30px rgba(20,224,209,.24)" }}>Z</div>
              <div><div className="brand-title">Z <span style={{ color: "#38e0f3" }}>⌁</span> LIFE</div><div className="brand-subtitle">by Ziepher Tech</div></div>
            </div>
          </Link>
          <div className="inline-actions" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link className="button" href="/today">My Day</Link>
            <Link className="button" href="/dashboard/modules">Modules</Link>
            <Link className="button" href="/assistant">Ask Z-Life</Link>
            <Link className="button" href="/settings">Settings</Link>
            <form action="/auth/sign-out" method="post"><button className="button">Sign out</button></form>
          </div>
        </header>

        <section style={{ position: "relative", overflow: "hidden", minHeight: 280, marginTop: 22, padding: "34px clamp(22px,4vw,52px)", border: "1px solid rgba(78,234,221,.25)", borderRadius: 26, background: "linear-gradient(115deg,rgba(2,15,18,.96),rgba(7,45,47,.76)), radial-gradient(circle at 76% 18%,rgba(56,224,243,.22),transparent 28%)", boxShadow: "0 22px 70px rgba(0,0,0,.34)" }}>
          <div style={{ maxWidth: 760 }}>
            <p style={{ margin: 0, color: "#7fffd4", fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase" }}>A more balanced tomorrow</p>
            <h1 style={{ margin: "12px 0 10px", fontSize: "clamp(38px,5vw,66px)", lineHeight: .96, letterSpacing: "-.045em" }}>Good morning, {firstName}.<br /><span style={{ color: "#38e0f3" }}>Your whole day, one place.</span></h1>
            <p style={{ maxWidth: 720, color: "#b8d2cf", lineHeight: 1.65, margin: 0 }}>Z-Life connects the modules you use, keeps the rest out of the way, and gives you one AI entry point for life, business, planning, and whatever comes next.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
              <Link href="/assistant" className="button primary" style={{ background: "linear-gradient(135deg,#38e0f3,#7fffd4)", color: "#001112", border: 0 }}>Ask Z-Life AI</Link>
              <Link href="/today" className="button">Open My Day</Link>
              <Link href="/dashboard/modules" className="button">Add a module</Link>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 16 }}>
          {summaryCards.map(([value, label, detail]) => (
            <article key={label} style={{ ...card, padding: 18 }}>
              <p style={{ margin: 0, color: "#9dbbb7", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</p>
              <strong style={{ display: "block", marginTop: 8, fontSize: 26, color: "#f6fffd" }}>{value}</strong>
              <small style={{ display: "block", marginTop: 4, color: "#789b97" }}>{detail}</small>
            </article>
          ))}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(300px,.85fr)", gap: 16, marginTop: 16 }}>
          <article style={{ ...card, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div><p className="panel-label" style={{ color: "#38e0f3" }}>Quick access</p><h2 style={{ margin: 0 }}>Your modules</h2></div>
              <Link href="/dashboard/modules" style={{ color: "#38e0f3", fontSize: 13 }}>Manage modules →</Link>
            </div>
            {previewModules.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
                {previewModules.map((module) => (
                  <Link key={module.module_key} href={module.route} style={{ color: "inherit", textDecoration: "none", padding: 16, border: "1px solid rgba(78,234,221,.18)", borderRadius: 15, background: "rgba(0,0,0,.16)" }}>
                    <span className="status-pill" style={{ color: module.status === "active" ? "#7fffd4" : undefined }}>{module.category}</span>
                    <h3 style={{ margin: "18px 0 6px" }}>{module.name}</h3>
                    <p style={{ margin: 0, color: "#8faaa7", fontSize: 13, lineHeight: 1.55 }}>{module.description}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ padding: 24, border: "1px dashed rgba(78,234,221,.25)", borderRadius: 15, textAlign: "center" }}>
                <h3 style={{ marginTop: 0 }}>Build your Z-Life around what you actually use.</h3>
                <p style={{ color: "#8faaa7" }}>Plug in only the parts you want. New modules will never be forced onto your dashboard.</p>
                <Link className="button primary" href="/dashboard/modules">Browse modules</Link>
              </div>
            )}
          </article>

          <aside style={{ ...card, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div><p className="panel-label" style={{ color: "#7fffd4" }}>Today at a glance</p><h2 style={{ margin: "4px 0 0" }}>Real connected data where it exists.</h2></div>
              <Link href="/today" style={{ color: "#7fffd4", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>Open My Day →</Link>
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              {todayRows.map((item) => (
                <Link key={item.label} href={item.href} style={{ color: "inherit", textDecoration: "none", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "11px 12px", borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.055)" }}>
                  <span><strong style={{ display: "block", fontSize: 13 }}>{item.label}</strong><small style={{ color: "#789b97" }}>{item.detail}</small></span>
                  <strong style={{ alignSelf: "center", color: "#38e0f3", fontSize: 12 }}>{item.value}</strong>
                </Link>
              ))}
            </div>
            <p style={{ margin: "14px 0 0", color: "#789b97", fontSize: 12, lineHeight: 1.5 }}>Z-Life shows live workspace information when a module is ready. Unbuilt or unconnected areas stay clearly labeled instead of displaying invented data.</p>
          </aside>
        </section>

        <section style={{ ...card, marginTop: 16, padding: 24, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 20, alignItems: "center" }}>
          <div>
            <p className="panel-label" style={{ color: "#38e0f3" }}>Ask Z-Life</p>
            <h2 style={{ margin: "4px 0 7px" }}>One AI teammate across every connected part of your life.</h2>
            <p style={{ margin: 0, color: "#8faaa7", lineHeight: 1.55 }}>Ask what needs attention, plan the day, work through a business problem, organize family tasks, or get routed to the right module automatically.</p>
          </div>
          <Link href="/assistant" className="button primary" style={{ whiteSpace: "nowrap", background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 }}>Open Ask Z-Life</Link>
        </section>
      </div>
    </main>
  );
}
