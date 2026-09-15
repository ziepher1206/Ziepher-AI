import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjectDomainStep } from "@/components/project-domain-step";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectDomainsPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in?next=/projects");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/projects/${projectId}/domains`)}`
    );
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id,name,business_name,current_version,preview_url")
    .eq("id", projectId)
    .single();
  if (error || !project) notFound();

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">Z-LIFE BUILD</div>
            <div className="brand-subtitle">DOMAIN</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}/studio`}>
            Back to preview
          </Link>
          <Link className="button" href={`/projects/${projectId}/media`}>
            Photos & references
          </Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <section className="project-card" style={{ display: "grid", gap: 10 }}>
          <p className="panel-label">Step 4 of 5 · Domain</p>
          <h1 style={{ margin: 0 }}>Give {project.business_name ?? project.name} a home.</h1>
          <p className="auth-copy" style={{ maxWidth: 860 }}>
            Z-Life generates matching names automatically, checks live Vercel registrar availability and pricing when the workspace is connected, and shows both registration and renewal cost before you leave for checkout.
          </p>
          <div className="inline-actions">
            <span className="status-pill">Build v{project.current_version ?? 0}</span>
            {project.preview_url ? (
              <a className="button" href={project.preview_url} target="_blank" rel="noreferrer">
                Review preview again
              </a>
            ) : null}
          </div>
        </section>

        <ProjectDomainStep projectId={projectId} />

        <section className="project-card" style={{ display: "grid", gap: 10 }}>
          <p className="panel-label">Next</p>
          <h2>Connect → Publish</h2>
          <p>
            Choosing a name does not publish the project. Domain ownership/DNS connection and production publishing remain separate approval steps.
          </p>
        </section>
      </section>
    </main>
  );
}
