import Link from "next/link";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function isMissingSchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "")
    || error.message?.includes("Could not find the table") === true;
}

const shell: React.CSSProperties = {
  minHeight: "100vh",
  overflowY: "auto",
  background: "radial-gradient(circle at 78% 3%,rgba(56,224,243,.13),transparent 26%),radial-gradient(circle at 10% 18%,rgba(16,217,129,.08),transparent 28%),linear-gradient(180deg,#02090b,#041315 52%,#02090b)",
  color: "#f6fffd"
};

const card: React.CSSProperties = {
  border: "1px solid rgba(78,234,221,.20)",
  borderRadius: 18,
  background: "linear-gradient(145deg,rgba(7,43,46,.78),rgba(3,22,25,.92))",
  boxShadow: "0 18px 55px rgba(0,0,0,.22)"
};

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const installations = await supabase
    .from("workspace_module_installations")
    .select("module_key,installed_at,zlife_module_catalog(module_key,name,description,route,category,status)")
    .eq("workspace_id", workspaceId)
    .order("installed_at", { ascending: true });

  if (isMissingSchema(installations.error)) {
    return (
      <main style={shell}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 18px 70px" }}>
          <div className="brand" style={{ marginBottom: 24 }}>
            <div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112" }}>Z</div>
            <div><div className="brand-title">Z <span style={{ color: "#38e0f3" }}>⌁</span> LIFE</div><div className="brand-subtitle">by Ziepher Tech</div></div>
          </div>
          <section style={{ ...card, padding: 26 }}>
            <p className="panel-label" style={{ color: "#38e0f3" }}>Almost ready</p>
            <h1 style={{ margin: "6px 0 10px" }}>This Z-Life workspace still needs one setup step.</h1>
            <p style={{ margin: 0, color: "#9dbbb7", lineHeight: 1.6 }}>The dashboard will stay simple instead of showing controls that cannot save yet.</p>
          </section>
        </div>
      </main>
    );
  }

  if (installations.error) throw installations.error;

  const installedModules = (installations.data ?? [])
    .map((row) => {
      const catalog = Array.isArray(row.zlife_module_catalog) ? row.zlife_module_catalog[0] : row.zlife_module_catalog;
      return catalog && catalog.status === "active" ? catalog : null;
    })
    .filter(Boolean) as Array<{ module_key: string; name: string; description: string; route: string; category: string; status: string }>;

  const now = new Date();
  const nowIso = now.toISOString();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const [leads, appointments, invoices, homeTasks] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "new"),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("starts_at", nowIso).lte("starts_at", next24Hours).neq("status", "canceled"),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "overdue"),
    supabase.from("home_tasks").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).neq("status", "done").neq("status", "cancelled")
  ]);

  for (const result of [leads, appointments, invoices, homeTasks]) {
    if (result.error && !isMissingSchema(result.error)) throw result.error;
  }

  const businessReady = !leads.error && !appointments.error && !invoices.error;
  const homeReady = !homeTasks.error;
  const firstName = user.email?.split("@")[0]?.split(/[._-]/)[0] ?? "there";

  const attention = [
    businessReady ? { label: "New leads", value: String(leads.count ?? 0), href: "/operate", detail: "Business" } : null,
    businessReady ? { label: "Next 24 hours", value: String(appointments.count ?? 0), href: "/operate/calendar", detail: "Appointments" } : null,
    businessReady ? { label: "Overdue", value: String(invoices.count ?? 0), href: "/operate/invoices", detail: "Invoices" } : null,
    homeReady ? { label: "Home tasks", value: String(homeTasks.count ?? 0), href: "/home", detail: "Home & Family" } : null
  ].filter(Boolean) as Array<{ label: string; value: string; href: string; detail: string }>;

  return (
    <main style={shell}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 18px 80px" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "15px 0", borderBottom: "1px solid rgba(78,234,221,.12)", background: "rgba(2,9,11,.90)", backdropFilter: "blur(18px)" }}>
          <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="brand">
              <div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112" }}>Z</div>
              <div><div className="brand-title">Z <span style={{ color: "#38e0f3" }}>⌁</span> LIFE</div><div className="brand-subtitle">HOME</div></div>
            </div>
          </Link>
          <Link className="button" href="/settings">Account</Link>
        </header>

        <section style={{ ...card, marginTop: 20, padding: "30px clamp(20px,4vw,44px)", background: "linear-gradient(120deg,rgba(2,15,18,.96),rgba(7,45,47,.78)),radial-gradient(circle at 84% 18%,rgba(56,224,243,.18),transparent 28%)" }}>
          <p style={{ margin: 0, color: "#7fffd4", fontSize: 11, fontWeight: 800, letterSpacing: ".17em", textTransform: "uppercase" }}>Good morning, {firstName}</p>
          <h1 style={{ margin: "10px 0 8px", fontSize: "clamp(38px,5vw,60px)", lineHeight: 1, letterSpacing: "-.04em" }}>What do you want to do?</h1>
          <p style={{ maxWidth: 680, margin: 0, color: "#9dbbb7", lineHeight: 1.6 }}>Start with one of these. Z-Life should guide you from there instead of making you figure out the whole system first.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 22 }}>
            <Link href="/assistant" style={{ textDecoration: "none", color: "#001112", padding: 20, borderRadius: 16, background: "linear-gradient(135deg,#38e0f3,#7fffd4)", fontWeight: 800 }}>
              <span style={{ display: "block", fontSize: 20 }}>Ask Z-Life</span>
              <small style={{ display: "block", marginTop: 5, color: "#073235" }}>Tell it what you need in plain English.</small>
            </Link>
            <Link href="/today" style={{ textDecoration: "none", color: "inherit", padding: 20, borderRadius: 16, border: "1px solid rgba(127,255,212,.22)", background: "rgba(0,0,0,.18)" }}>
              <span style={{ display: "block", fontSize: 20, fontWeight: 800 }}>My Day</span>
              <small style={{ display: "block", marginTop: 5, color: "#8faaa7" }}>See reminders, appointments, tasks, and what needs attention.</small>
            </Link>
          </div>
        </section>

        {attention.length ? (
          <section style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div><p className="panel-label" style={{ color: "#38e0f3" }}>Right now</p><h2 style={{ margin: "3px 0 0" }}>Only what needs attention</h2></div>
              <Link href="/today" style={{ color: "#7fffd4", fontSize: 13, textDecoration: "none" }}>See My Day →</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
              {attention.map((item) => (
                <Link key={item.label} href={item.href} style={{ ...card, padding: 16, color: "inherit", textDecoration: "none" }}>
                  <small style={{ color: "#789b97" }}>{item.detail}</small>
                  <strong style={{ display: "block", marginTop: 6, fontSize: 28 }}>{item.value}</strong>
                  <span style={{ color: "#b8d2cf", fontSize: 13 }}>{item.label}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section style={{ ...card, marginTop: 18, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div><p className="panel-label" style={{ color: "#7fffd4" }}>Working areas</p><h2 style={{ margin: "3px 0 0" }}>Things you can actually use</h2></div>
            <Link href="/dashboard/modules" style={{ color: "#38e0f3", fontSize: 13, textDecoration: "none" }}>Manage →</Link>
          </div>

          {installedModules.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
              {installedModules.slice(0, 4).map((module) => (
                <Link key={module.module_key} href={module.route} style={{ color: "inherit", textDecoration: "none", padding: 16, borderRadius: 14, border: "1px solid rgba(78,234,221,.15)", background: "rgba(0,0,0,.16)" }}>
                  <strong style={{ display: "block" }}>{module.name}</strong>
                  <small style={{ display: "block", marginTop: 5, color: "#789b97", lineHeight: 1.45 }}>{module.description}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 14, background: "rgba(0,0,0,.14)" }}>
              <p style={{ margin: 0, color: "#9dbbb7" }}>No working areas are pinned yet. You can still use Ask Z-Life and My Day right now.</p>
            </div>
          )}
        </section>

        <section style={{ marginTop: 18, padding: "16px 4px", color: "#789b97", fontSize: 13, lineHeight: 1.55 }}>
          <strong style={{ color: "#b8d2cf" }}>Simpler by default.</strong> Preview modules and unfinished controls stay out of the main interface until they actually work.
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/dashboard/modules" style={{ color: "#7fffd4", textDecoration: "none" }}>Modules</Link>
            <Link href="/settings" style={{ color: "#7fffd4", textDecoration: "none" }}>Settings</Link>
            <form action="/auth/sign-out" method="post"><button type="submit" style={{ padding: 0, border: 0, background: "transparent", color: "#7fffd4", cursor: "pointer" }}>Sign out</button></form>
          </div>
        </section>
      </div>
    </main>
  );
}
