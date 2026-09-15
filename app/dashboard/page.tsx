import Link from "next/link";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function isMissingModuleSchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("Could not find the table") === true;
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

  const previewModules = modules.slice(0, 8);
  const firstName = user.email?.split("@")[0]?.split(/[._-]/)[0] ?? "there";

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
            <Link className="button" href="/dashboard/modules">Modules</Link>
            <Link className="button" href="/operate/assistant">Ask Z-Life</Link>
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
              <Link href="/operate/assistant" className="button primary" style={{ background: "linear-gradient(135deg,#38e0f3,#7fffd4)", color: "#001112", border: 0 }}>Ask Z-Life AI</Link>
              <Link href="/dashboard/modules" className="button">Add a module</Link>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 16 }}>
          {[
            [String(modules.length), "Active modules", "Connected to your Z-Life"],
            ["1", "AI entry point", "One place to ask anything"],
            [workspace?.name ?? "Your workspace", "Workspace", "Life and business context"],
            ["On", "Z-Life Core", "Working quietly underneath"]
          ].map(([value, label, detail]) => (
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
            <p className="panel-label" style={{ color: "#7fffd4" }}>Today at a glance</p>
            <h2 style={{ margin: "4px 0 16px" }}>Everything important, without the clutter.</h2>
            <div style={{ display: "grid", gap: 9 }}>
              {["Life & personal", "Business", "Health", "Family & school", "Grocery & shopping", "Bills & subscriptions", "Errands", "Auto & vehicle", "Documents", "End of day"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 12px", borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.055)" }}>
                  <span style={{ fontSize: 13 }}>{item}</span><span style={{ color: "#38e0f3" }}>›</span>
                </div>
              ))}
            </div>
            <p style={{ margin: "14px 0 0", color: "#789b97", fontSize: 12, lineHeight: 1.5 }}>These categories become live as connected modules begin supplying calendar items, reminders, payments, tasks, and other daily context.</p>
          </aside>
        </section>

        <section style={{ ...card, marginTop: 16, padding: 24, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 20, alignItems: "center" }}>
          <div>
            <p className="panel-label" style={{ color: "#38e0f3" }}>Ask Z-Life</p>
            <h2 style={{ margin: "4px 0 7px" }}>One AI teammate across every connected part of your life.</h2>
            <p style={{ margin: 0, color: "#8faaa7", lineHeight: 1.55 }}>Ask what needs attention, plan the day, work through a business problem, organize family tasks, or get routed to the right module automatically.</p>
          </div>
          <Link href="/operate/assistant" className="button primary" style={{ whiteSpace: "nowrap", background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 }}>Open AI Assistant</Link>
        </section>
      </div>
    </main>
  );
}
