import Link from "next/link";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function isMissingModuleSchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("Could not find the table") === true;
}

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
      <main className="projects-page">
        <header className="projects-header">
          <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">Z-LIFE</div><div className="brand-subtitle">YOUR OPERATING SYSTEM</div></div></div>
          <Link className="button" href="/">Home</Link>
        </header>
        <section className="auth-card" style={{ maxWidth: 900 }}>
          <p className="panel-label">Modular dashboard readiness</p>
          <h1 style={{ margin: "6px 0 10px" }}>Your plug-in dashboard is ready in code.</h1>
          <p className="auth-copy">This environment still needs the workspace module installation migration before ZLife can save which modules you chose. Until that migration is applied, ZLife will not pretend module selections are persisted.</p>
          <p className="auth-copy"><code>20260915111000_workspace_module_installations.sql</code></p>
        </section>
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

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">Z-LIFE</div><div className="brand-subtitle">YOUR OPERATING SYSTEM</div></div></div>
        <div className="inline-actions">
          <Link className="button" href="/dashboard/modules">Add modules</Link>
          <Link className="button" href="/settings">Settings</Link>
          <form action="/auth/sign-out" method="post"><button className="button">Sign out</button></form>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <div>
          <p className="panel-label">{workspace?.name ?? "Your workspace"} · ZLife Core running underneath</p>
          <h1 style={{ margin: "6px 0 8px" }}>Your ZLife</h1>
          <p className="auth-copy" style={{ maxWidth: 820, margin: 0 }}>
            You only see the modules you chose to plug in. ZLife Core, the AI team, and community-built infrastructure stay behind the scenes unless they need your attention.
          </p>
        </div>

        {modules.length ? (
          <section className="project-grid" style={{ marginTop: 0 }}>
            {modules.map((module) => (
              <Link className="project-card" href={module.route} key={module.module_key}>
                <span className="status-pill">{module.category}</span>
                <h2>{module.name}</h2>
                <p>{module.description}</p>
              </Link>
            ))}
          </section>
        ) : (
          <section className="auth-card" style={{ maxWidth: 860 }}>
            <p className="panel-label">No modules plugged in yet</p>
            <h2 style={{ margin: "6px 0 10px" }}>Build your ZLife around what you actually use.</h2>
            <p className="auth-copy">Browse the module catalog and plug in only the parts you want. New modules created by ZLife AI and the community will never be forced onto your dashboard.</p>
            <Link className="button primary" href="/dashboard/modules">Browse modules</Link>
          </section>
        )}
      </section>
    </main>
  );
}
