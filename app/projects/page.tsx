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

function projectType(originalIdea: string | null) {
  return /project type:\s*app\b/i.test(originalIdea ?? "") ? "App" : "Website";
}

function nextBuilderStep(project: {
  id: string;
  current_version: number | null;
  primary_domain: string | null;
}) {
  if (Number(project.current_version ?? 0) <= 0) {
    return {
      href: `/projects/${project.id}/media`,
      label: "Step 2 · Add photos & references",
      detail: "Give Z-Life the real photos, logo, screenshots, or visual direction you want it to use."
    };
  }

  if (!project.primary_domain) {
    return {
      href: `/projects/${project.id}/studio`,
      label: "Step 3 · Review & refine",
      detail: "Open the latest preview, check Design Quality, and tell Z-Life what you want changed."
    };
  }

  return {
    href: `/projects/${project.id}/publish`,
    label: "Step 5 · Check publish readiness",
    detail: "Review the preview, verified domain, and deployment target before any production approval."
  };
}

export default async function ProjectsPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in?next=/projects");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?next=/projects");

  const { data: projects } = await supabase
    .from("projects")
    .select("id,name,business_name,original_idea,source_domain,primary_domain,scan_status,status,current_version,updated_at")
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
            <h2 style={{ margin: "6px 0 14px" }}>Continue exactly where you left off</h2>
            <div className="project-grid" style={{ marginTop: 0 }}>
              {(projects ?? []).map((project) => {
                const domain = project.primary_domain ?? project.source_domain;
                const next = nextBuilderStep(project);
                const type = projectType(project.original_idea);
                return (
                  <Link className="project-card" href={next.href} key={project.id} style={{ display: "grid", gap: 10 }}>
                    <div className="project-card-top">
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        <span className="status-pill">{type}</span>
                        <span className="status-pill">{statusLabel(project.scan_status)}</span>
                      </div>
                      <span className="project-version">v{project.current_version ?? 0}</span>
                    </div>
                    <div>
                      <h2 style={{ marginBottom: 6 }}>{project.business_name ?? project.name}</h2>
                      <p style={{ margin: 0 }}>{domain ? domain : "No domain yet — that comes after you approve the design."}</p>
                    </div>
                    <div style={{ padding: "11px 12px", borderRadius: 12, border: "1px solid rgba(127,255,212,.18)", background: "rgba(127,255,212,.055)" }}>
                      <strong style={{ display: "block", color: "#dffbf4", marginBottom: 4 }}>{next.label}</strong>
                      <small style={{ display: "block", lineHeight: 1.45 }}>{next.detail}</small>
                    </div>
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
