import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectVercelTargetForm } from "@/components/project-vercel-target-form";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectDeploymentSettingsPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id,name,vercel_project_id,vercel_project_name,vercel_org_id"
    )
    .eq("id", projectId)
    .single();
  if (error || !project) redirect("/projects");

  const currentTarget =
    project.vercel_project_id && project.vercel_project_name && project.vercel_org_id
      ? {
          id: project.vercel_project_id,
          name: project.vercel_project_name,
          orgId: project.vercel_org_id
        }
      : null;

  return (
    <main className="settings-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER AI</div>
            <div className="brand-subtitle">PROJECT DEPLOYMENT TARGET</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}`}>
            Return to project
          </Link>
          <Link className="button" href={`/projects/${projectId}/settings/repository`}>
            GitHub repository
          </Link>
        </div>
      </header>

      <section className="settings-intro">
        <span className="panel-label">{project.name}</span>
        <h1>Choose the project&apos;s Vercel deployment target</h1>
        <p>
          Ziepher validates the target with Vercel before saving it. Every future Vercel
          deployment snapshots the canonical project and account IDs so later settings
          changes cannot redirect work that was already approved or queued.
        </p>
      </section>

      <section className="billing-shell">
        <ProjectVercelTargetForm
          projectId={projectId}
          currentTarget={currentTarget}
          tokenConfigured={Boolean(process.env.VERCEL_TOKEN)}
        />
      </section>
    </main>
  );
}
