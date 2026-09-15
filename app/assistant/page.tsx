import Link from "next/link";
import { redirect } from "next/navigation";

import { ZLifeAssistantRouter } from "@/components/zlife-assistant-router";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const card: React.CSSProperties = {
  border: "1px solid rgba(78,234,221,.24)",
  borderRadius: 20,
  background: "linear-gradient(145deg,rgba(7,43,46,.84),rgba(3,22,25,.94))",
  boxShadow: "0 18px 55px rgba(0,0,0,.24)"
};

export default async function AssistantPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const installations = await supabase
    .from("workspace_module_installations")
    .select("module_key,zlife_module_catalog(module_key,name,route,category,status)")
    .eq("workspace_id", workspaceId);

  const modules = (installations.data ?? [])
    .map((row) => {
      const catalog = Array.isArray(row.zlife_module_catalog) ? row.zlife_module_catalog[0] : row.zlife_module_catalog;
      return catalog && catalog.status !== "hidden" && catalog.status !== "retired" ? catalog : null;
    })
    .filter(Boolean) as Array<{ module_key: string; name: string; route: string; category: string; status: string }>;

  return (
    <main style={{ minHeight: "100vh", overflowY: "auto", color: "#f6fffd", background: "radial-gradient(circle at 72% 5%,rgba(56,224,243,.16),transparent 25%),radial-gradient(circle at 12% 18%,rgba(16,217,129,.09),transparent 28%),linear-gradient(180deg,#02090b,#041315 52%,#02090b)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 18px 70px" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(78,234,221,.16)", background: "rgba(2,9,11,.88)", backdropFilter: "blur(18px)" }}>
          <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="brand">
              <div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112" }}>Z</div>
              <div><div className="brand-title">Z <span style={{ color: "#38e0f3" }}>⌁</span> LIFE</div><div className="brand-subtitle">ASK Z-LIFE</div></div>
            </div>
          </Link>
          <div className="inline-actions"><Link className="button" href="/dashboard">My Z-Life</Link><Link className="button" href="/dashboard/modules">Modules</Link></div>
        </header>

        <section style={{ ...card, marginTop: 24, padding: "32px clamp(22px,4vw,48px)", background: "linear-gradient(120deg,rgba(2,15,18,.96),rgba(7,45,47,.78)),radial-gradient(circle at 84% 20%,rgba(56,224,243,.20),transparent 28%)" }}>
          <p style={{ margin: 0, color: "#7fffd4", fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase" }}>One front door for Z-Life</p>
          <h1 style={{ margin: "10px 0", fontSize: "clamp(40px,5vw,64px)", lineHeight: .98, letterSpacing: "-.045em" }}>Ask once.<br /><span style={{ color: "#38e0f3" }}>Go to the right place.</span></h1>
          <p style={{ maxWidth: 820, margin: 0, color: "#b0cac7", lineHeight: 1.65 }}>Z-Life should not make you learn where every feature lives. Start here, describe what you need, and the platform routes you toward the connected module or safe next step.</p>
        </section>

        <section style={{ ...card, marginTop: 16, padding: 24 }}>
          <div style={{ marginBottom: 18 }}><p className="panel-label" style={{ color: "#38e0f3" }}>Zero-cost routing first</p><h2 style={{ margin: "4px 0 7px" }}>What can Z-Life help organize?</h2><p style={{ margin: 0, color: "#8faaa7", lineHeight: 1.55 }}>The router below works without spending AI tokens. It sends you to real connected tools when it has enough context and clearly labels areas that are still in development.</p></div>
          <ZLifeAssistantRouter />
        </section>

        <section style={{ ...card, marginTop: 16, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
            <div><p className="panel-label" style={{ color: "#7fffd4" }}>Connected now</p><h2 style={{ margin: "4px 0 0" }}>Your installed modules</h2></div>
            <Link href="/dashboard/modules" style={{ color: "#38e0f3", textDecoration: "none", fontSize: 13 }}>Manage modules →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginTop: 16 }}>
            {modules.length ? modules.map((module) => (
              <Link key={module.module_key} href={module.route} style={{ color: "inherit", textDecoration: "none", border: "1px solid rgba(78,234,221,.18)", borderRadius: 15, background: "rgba(0,0,0,.16)", padding: 16 }}>
                <span className="status-pill">{module.category}</span><h3 style={{ margin: "16px 0 5px" }}>{module.name}</h3><small style={{ color: "#789b97" }}>Open connected workspace →</small>
              </Link>
            )) : <p style={{ color: "#8faaa7" }}>No optional modules are installed yet. Z-Life Core is still available underneath.</p>}
          </div>
        </section>

        <section style={{ ...card, marginTop: 16, padding: 24, borderColor: "rgba(127,255,212,.30)" }}>
          <p className="panel-label" style={{ color: "#7fffd4" }}>Business intelligence</p>
          <h2 style={{ margin: "4px 0 7px" }}>Business has a deeper operational assistant today.</h2>
          <p style={{ margin: 0, color: "#8faaa7", lineHeight: 1.55 }}>The Business assistant can inspect live workspace records and build a read-only priority queue. Optional paid AI explanation remains approval-gated and cannot silently message customers, charge cards, publish ads, or change production.</p>
          <Link href="/operate/assistant" className="button primary" style={{ display: "inline-flex", marginTop: 14, textDecoration: "none", background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 }}>Open Business AI workspace</Link>
        </section>
      </div>
    </main>
  );
}
