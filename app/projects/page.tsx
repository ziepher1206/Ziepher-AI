import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteOnboardingForm } from "@/components/site-onboarding-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function statusLabel(status: string | null) {
  switch (status) {
    case "pending": return "Ready";
    case "scanning": return "Scanning";
    case "complete": return "Ready to refine";
    case "failed": return "Needs attention";
    default: return "Draft";
  }
}

export default async function ProjectsPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in?next=/projects");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?next=/projects");

  const { data: projects } = await supabase
    .from("projects")
    .select("id,name,business_name,source_domain,primary_domain,scan_status,status,current_version,updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">Z-LIFE BUILD</div>
            <div className="brand-subtitle">AI WEBSITE & APP BUILDER</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/dashboard">Z-Life Home</Link>
          <form action="/auth/sign-out" method="post"><button className="button">Sign out</button></form>
        </div>
      </header>

      <section style={{ display: "grid", gap: 28 }}>
        <div>
          <p className="panel-label">Idea → references → preview → refine → domain → publish</p>
          <h1 style={{ margin: "6px 0 10px" }}>Build something without learning the technical stack first.</h1>
          <p className="auth-copy" style={{ maxWidth: 800 }}>
            Start with what you want. Z-Life guides the rest of the process and keeps hosting, source control, deployment, and other technical settings out of the main path.
          </p>
        </div>

        <SiteOnboardingForm />

        {(projects ?? []).length ? (
          <section>
            <p className="panel-label">Your projects</p>
            <h2 style={{ margin: "6px 0 14px" }}>Continue where you left off</h2>
            <div className="project-grid" style={{ marginTop: 0 }}>
              {(projects ?? []).map((project) => {
                const domain = project.primary_domain ?? project.source_domain;
                return (
                  <Link className="project-card" href={`/projects/${project.id}/studio`} key={project.id}>
                    <div className="project-card-top">
                      <span className="status-pill">{statusLabel(project.scan_status)}</span>
                      <span className="project-version">v{project.current_version}</span>
                    </div>
                    <h2>{project.business_name ?? project.name}</h2>
                    <p>{domain ? domain : "No domain yet — choose one after the design is approved."}</p>
                    <small>Updated {new Date(project.updated_at).toLocaleDateString()}</small>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
