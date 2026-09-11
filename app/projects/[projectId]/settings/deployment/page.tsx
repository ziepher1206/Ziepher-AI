import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectVercelTargetForm } from "@/components/project-vercel-target-form";
import { listAccessibleVercelProjects } from "@/lib/deployment/vercel-projects";
import { isSupabaseConfigured } from "@/lib/env";
import { getProviderConnection } from "@/lib/provider-connections/store";
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
      "id,name,workspace_id,vercel_project_id,vercel_project_name,vercel_org_id"
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

  const vercelConnection = project.workspace_id
    ? await getProviderConnection(project.workspace_id, "vercel")
    : null;
  const connectionConfigured =
    vercelConnection?.status === "connected" && Boolean(vercelConnection.accessToken);

  let availableTargets: Array<{ id: string; name: string; orgId: string }> = [];
  let discoveryError: string | null = null;
  if (connectionConfigured && vercelConnection?.accessToken) {
    try {
      const teamId = vercelConnection.provider_account_id?.startsWith("team_")
        ? vercelConnection.provider_account_id
        : null;
      availableTargets = await listAccessibleVercelProjects(
        vercelConnection.accessToken,
        teamId
      );
    } catch (caught) {
      discoveryError =
        caught instanceof Error
          ? caught.message
          : "Vercel projects could not be loaded.";
    }
  }

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
          <Link className="button" href="/settings/connections">
            Connected rails
          </Link>
        </div>
      </header>

      <section className="settings-intro">
        <span className="panel-label">{project.name}</span>
        <h1>Choose the project&apos;s Vercel deployment target</h1>
        <p>
          Ziepher lists projects visible to this workspace&apos;s connected Vercel account and re-validates the exact target before saving it. Every future Vercel deployment snapshots the canonical project and account IDs so later settings changes cannot redirect work that was already approved or queued.
        </p>
      </section>

      <section className="billing-shell">
        <ProjectVercelTargetForm
          projectId={projectId}
          currentTarget={currentTarget}
          connectionConfigured={connectionConfigured}
          availableTargets={availableTargets}
          discoveryError={discoveryError}
        />
      </section>
    </main>
  );
}
