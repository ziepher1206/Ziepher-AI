import Link from "next/link";
import { redirect } from "next/navigation";

import { installModuleAction, removeModuleAction } from "@/app/dashboard/actions";
import { ZLifeHeartbeat } from "@/components/zlife-heartbeat";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const shell: React.CSSProperties = {
  minHeight: "100vh",
  overflowY: "auto",
  background: "radial-gradient(circle at 78% 5%, rgba(20,224,209,.15), transparent 24%), radial-gradient(circle at 8% 22%, rgba(16,217,129,.08), transparent 26%), linear-gradient(180deg,#02090b 0%,#041315 52%,#02090b 100%)",
  color: "#f6fffd"
};

const card: React.CSSProperties = {
  border: "1px solid rgba(78,234,221,.24)",
  borderRadius: 18,
  background: "linear-gradient(145deg,rgba(7,43,46,.84),rgba(3,22,25,.94))",
  boxShadow: "0 18px 55px rgba(0,0,0,.22)"
};

export default async function DashboardModulesPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const [{ data: catalog, error: catalogError }, { data: installed, error: installedError }] = await Promise.all([
    supabase
      .from("zlife_module_catalog")
      .select("module_key,name,description,route,category,status")
      .eq("status", "available")
      .order("name", { ascending: true }),
    supabase
      .from("workspace_module_installations")
      .select("module_key")
      .eq("workspace_id", workspaceId),
  ]);

  if (catalogError || installedError) throw catalogError ?? installedError;
  const installedKeys = new Set((installed ?? []).map((row) => row.module_key));
  const workingModules = catalog ?? [];

  return (
    <main style={shell}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 18px 70px" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(78,234,221,.16)", background: "rgba(2,9,11,.88)", backdropFilter: "blur(18px)" }}>
          <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="brand">
              <div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112" }}>Z</div>
              <div>
                <div className="brand-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><span>Z</span><ZLifeHeartbeat width={32} height={12} /><span>LIFE</span></div>
                <div className="brand-subtitle">WORKING MODULES</div>
              </div>
            </div>
          </Link>
          <div className="inline-actions"><Link className="button" href="/dashboard">Home</Link><Link className="button" href="/assistant">Ask Z-Life</Link></div>
        </header>

        <section style={{ ...card, marginTop: 22, padding: "30px clamp(22px,4vw,44px)", background: "linear-gradient(120deg,rgba(2,15,18,.96),rgba(7,45,47,.78)),radial-gradient(circle at 82% 20%,rgba(56,224,243,.20),transparent 25%)" }}>
          <p style={{ margin: 0, color: "#7fffd4", fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase" }}>Keep it simple</p>
          <h1 style={{ margin: "10px 0", fontSize: "clamp(36px,5vw,58px)", lineHeight: .98, letterSpacing: "-.045em" }}>Only working modules are shown here.</h1>
          <p style={{ maxWidth: 760, margin: 0, color: "#b0cac7", lineHeight: 1.65 }}>If a Z-Life area is still being built, it stays out of this screen. New modules will appear here only when there is something useful you can actually do with them.</p>
        </section>

        <section style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, marginBottom: 12 }}>
            <div><p className="panel-label" style={{ color: "#38e0f3" }}>Available now</p><h2 style={{ margin: "4px 0 0" }}>Choose what belongs in your Z-Life.</h2></div>
            <span style={{ color: "#789b97", fontSize: 12 }}>{installedKeys.size} installed</span>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {workingModules.map((module) => {
              const isInstalled = installedKeys.has(module.module_key);
              return (
                <article key={module.module_key} style={{ ...card, padding: 20, borderColor: isInstalled ? "rgba(127,255,212,.52)" : "rgba(78,234,221,.22)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                    <div>
                      <span className="status-pill" style={{ color: "#7fffd4" }}>Working now</span>
                      <h2 style={{ margin: "14px 0 6px" }}>{module.name}</h2>
                      <p style={{ maxWidth: 680, margin: 0, color: "#8faaa7", lineHeight: 1.55 }}>{module.description}</p>
                    </div>
                    <form action={isInstalled ? removeModuleAction : installModuleAction}>
                      <input type="hidden" name="moduleKey" value={module.module_key} />
                      <button className={isInstalled ? "button" : "button primary"} type="submit" style={!isInstalled ? { background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 } : undefined}>
                        {isInstalled ? "Remove" : "Add to my Z-Life"}
                      </button>
                    </form>
                  </div>
                  {isInstalled ? <Link href={module.route} style={{ display: "inline-flex", marginTop: 14, color: "#38e0f3", textDecoration: "none", fontSize: 13 }}>Open {module.name} →</Link> : null}
                </article>
              );
            })}
          </div>

          {!workingModules.length ? (
            <section style={{ ...card, padding: 24, textAlign: "center" }}>
              <h2 style={{ marginTop: 0 }}>Nothing else to set up right now.</h2>
              <p style={{ color: "#8faaa7" }}>Use Z-Life Core, My Day, and Ask Z-Life. Working modules will appear here as they become ready.</p>
              <Link className="button primary" href="/dashboard">Back home</Link>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
