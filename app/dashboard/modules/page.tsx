import Link from "next/link";
import { redirect } from "next/navigation";

import { installModuleAction, removeModuleAction } from "@/app/dashboard/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const shell: React.CSSProperties = {
  minHeight: "100vh",
  overflowY: "auto",
  background:
    "radial-gradient(circle at 78% 5%, rgba(20,224,209,.15), transparent 24%), radial-gradient(circle at 8% 22%, rgba(16,217,129,.08), transparent 26%), linear-gradient(180deg,#02090b 0%,#041315 52%,#02090b 100%)",
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
      .in("status", ["available", "preview"])
      .order("name", { ascending: true }),
    supabase
      .from("workspace_module_installations")
      .select("module_key")
      .eq("workspace_id", workspaceId),
  ]);

  if (catalogError || installedError) throw catalogError ?? installedError;
  const installedKeys = new Set((installed ?? []).map((row) => row.module_key));

  return (
    <main style={shell}>
      <div style={{ maxWidth: 1380, margin: "0 auto", padding: "0 18px 70px" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(78,234,221,.16)", background: "rgba(2,9,11,.88)", backdropFilter: "blur(18px)" }}>
          <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="brand">
              <div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112" }}>Z</div>
              <div><div className="brand-title">Z <span style={{ color: "#38e0f3" }}>⌁</span> LIFE</div><div className="brand-subtitle">MODULE CATALOG</div></div>
            </div>
          </Link>
          <div className="inline-actions" style={{ flexWrap: "wrap" }}>
            <Link className="button" href="/dashboard">My Z-Life</Link>
            <Link className="button" href="/operate/assistant">Ask Z-Life</Link>
            <Link className="button" href="/modules">Explore plans</Link>
          </div>
        </header>

        <section style={{ ...card, position: "relative", overflow: "hidden", marginTop: 22, padding: "32px clamp(22px,4vw,50px)", background: "linear-gradient(120deg,rgba(2,15,18,.96),rgba(7,45,47,.78)),radial-gradient(circle at 82% 20%,rgba(56,224,243,.20),transparent 25%)" }}>
          <p style={{ margin: 0, color: "#7fffd4", fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase" }}>Build your own Z-Life</p>
          <h1 style={{ margin: "10px 0 10px", fontSize: "clamp(38px,5vw,62px)", lineHeight: .98, letterSpacing: "-.045em" }}>Choose only what you need.</h1>
          <p style={{ maxWidth: 850, margin: 0, color: "#b0cac7", lineHeight: 1.65 }}>Z-Life grows around you instead of forcing every feature into one giant menu. Plug in the parts that matter now, remove them whenever you want, and add more later as your life or business changes.</p>
        </section>

        <section style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, marginBottom: 14 }}>
            <div>
              <p className="panel-label" style={{ color: "#38e0f3" }}>Available modules</p>
              <h2 style={{ margin: "4px 0 0" }}>Your Z-Life, your setup.</h2>
            </div>
            <span style={{ color: "#789b97", fontSize: 12 }}>{installedKeys.size} currently installed</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
            {(catalog ?? []).map((module) => {
              const isInstalled = installedKeys.has(module.module_key);
              return (
                <article key={module.module_key} style={{ ...card, padding: 20, borderColor: isInstalled ? "rgba(127,255,212,.52)" : "rgba(78,234,221,.22)", boxShadow: isInstalled ? "0 0 34px rgba(16,217,129,.08)" : card.boxShadow }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                    <span className="status-pill" style={{ color: module.status === "preview" ? "#38e0f3" : "#7fffd4" }}>{module.status === "preview" ? "Preview" : module.category}</span>
                    {isInstalled ? <span style={{ color: "#7fffd4", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Installed</span> : null}
                  </div>
                  <h2 style={{ margin: "20px 0 7px" }}>{module.name}</h2>
                  <p style={{ minHeight: 68, margin: 0, color: "#8faaa7", lineHeight: 1.55 }}>{module.description}</p>
                  <form action={isInstalled ? removeModuleAction : installModuleAction} style={{ marginTop: 18 }}>
                    <input type="hidden" name="moduleKey" value={module.module_key} />
                    <button className={isInstalled ? "button" : "button primary"} type="submit" style={!isInstalled ? { background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 } : undefined}>
                      {isInstalled ? "Remove from my Z-Life" : "Plug into my Z-Life"}
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
