import Link from "next/link";
import { redirect } from "next/navigation";

import { installModuleAction, removeModuleAction } from "@/app/dashboard/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

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
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">Z-LIFE</div><div className="brand-subtitle">MODULE CATALOG</div></div></div>
        <div className="inline-actions"><Link className="button" href="/dashboard">My ZLife</Link><Link className="button" href="/modules">Explore plans</Link></div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <div>
          <p className="panel-label">Plug in only what you want</p>
          <h1 style={{ margin: "6px 0 8px" }}>Choose your modules.</h1>
          <p className="auth-copy" style={{ maxWidth: 860, margin: 0 }}>
            ZLife AI and the community can keep creating and improving modules without cluttering your workspace. Installing a module adds it to your dashboard; removing it hides the module without turning the rest of ZLife into a giant menu.
          </p>
        </div>

        <section className="project-grid" style={{ marginTop: 0 }}>
          {(catalog ?? []).map((module) => {
            const isInstalled = installedKeys.has(module.module_key);
            return (
              <article className="project-card" key={module.module_key}>
                <span className="status-pill">{module.status === "preview" ? "Preview" : module.category}</span>
                <h2>{module.name}</h2>
                <p>{module.description}</p>
                <form action={isInstalled ? removeModuleAction : installModuleAction} style={{ marginTop: 14 }}>
                  <input type="hidden" name="moduleKey" value={module.module_key} />
                  <button className={isInstalled ? "button" : "button primary"} type="submit">
                    {isInstalled ? "Remove from my ZLife" : "Plug into my ZLife"}
                  </button>
                </form>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
