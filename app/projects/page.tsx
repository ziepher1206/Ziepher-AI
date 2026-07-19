import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function ProjectsPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: projects } = await supabase
    .from("projects")
    .select("id,name,original_idea,status,current_version,updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER AI</div>
            <div className="brand-subtitle">YOUR PROJECTS</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button primary" href="/">
            New project
          </Link>
          <form action="/auth/sign-out" method="post">
            <button className="button">Sign out</button>
          </form>
        </div>
      </header>

      <section className="project-grid">
        {(projects ?? []).map((project) => (
          <Link
            className="project-card"
            href={`/projects/${project.id}`}
            key={project.id}
          >
            <div className="project-card-top">
              <span className="status-pill">{project.status}</span>
              <span className="project-version">
                v{project.current_version}
              </span>
            </div>
            <h2>{project.name}</h2>
            <p>{project.original_idea}</p>
            <small>
              Updated {new Date(project.updated_at).toLocaleDateString()}
            </small>
          </Link>
        ))}

        {!projects?.length ? (
          <section className="empty-projects">
            <h1>Build your first dream</h1>
            <p>
              Start with a voice idea, a template, or a typed description.
            </p>
            <Link className="button primary" href="/">
              Open the studio
            </Link>
          </section>
        ) : null}
      </section>
    </main>
  );
}
