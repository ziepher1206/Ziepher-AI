import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteOnboardingForm } from "@/components/site-onboarding-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function statusLabel(status: string | null) {
  switch (status) {
    case "pending":
      return "Ready to scan";
    case "scanning":
      return "Scanning";
    case "complete":
      return "Scan complete";
    case "failed":
      return "Scan needs attention";
    default:
      return "Not scanned";
  }
}

export default async function ProjectsPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id,name,business_name,source_domain,primary_domain,scan_status,last_scanned_at,status,current_version,updated_at"
    )
    .order("updated_at", { ascending: false });

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-title">SITEREFINER</div>
            <div className="brand-subtitle">BUILT BY ZIEPHER TECH</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/settings">
            Settings
          </Link>
          <form action="/auth/sign-out" method="post">
            <button className="button">Sign out</button>
          </form>
        </div>
      </header>

      <section style={{ display: "grid", gap: 28 }}>
        <div>
          <p className="panel-label">Business websites</p>
          <h1 style={{ margin: "6px 0 10px" }}>Manage and improve your websites</h1>
          <p className="auth-copy" style={{ maxWidth: 760 }}>
            Connect an existing business website, review what SiteRefiner finds, request changes in plain language, and publish only after review and approval.
          </p>
        </div>

        <SiteOnboardingForm />

        <section className="project-grid" style={{ marginTop: 0 }}>
          {(projects ?? []).map((project) => {
            const domain = project.primary_domain ?? project.source_domain;
            return (
              <Link
                className="project-card"
                href={`/projects/${project.id}`}
                key={project.id}
              >
                <div className="project-card-top">
                  <span className="status-pill">{statusLabel(project.scan_status)}</span>
                  <span className="project-version">v{project.current_version}</span>
                </div>
                <h2>{project.business_name ?? project.name}</h2>
                <p>{domain ?? "Domain not connected"}</p>
                <small>
                  Updated {new Date(project.updated_at).toLocaleDateString()}
                </small>
              </Link>
            );
          })}

          {!projects?.length ? (
            <section className="empty-projects">
              <h2>No websites connected yet</h2>
              <p>Add the business name and current domain above to create the first SiteRefiner workspace.</p>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}
