import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectRepositoryPicker } from "@/components/project-repository-picker";
import { isSupabaseConfigured } from "@/lib/env";
import { getUsableGitHubAccessToken } from "@/lib/provider-connections/github-oauth";
import { listWritableGitHubRepositories } from "@/lib/source-control/github-repositories";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectRepositorySettingsPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      "id,name,workspace_id,repository_full_name,repository_default_branch,repository_url"
    )
    .eq("id", projectId)
    .single();

  if (projectError || !project) redirect("/projects");

  let repositories: Array<{
    fullName: string;
    url: string;
    defaultBranch: string;
    private: boolean;
  }> = [];
  let discoveryError: string | null = null;

  if (!project.workspace_id) {
    discoveryError = "This project does not belong to a workspace yet.";
  } else {
    try {
      const accessToken = await getUsableGitHubAccessToken(project.workspace_id);
      const available = await listWritableGitHubRepositories(accessToken);
      repositories = available.map((repository) => ({
        fullName: repository.fullName,
        url: repository.url,
        defaultBranch: repository.defaultBranch,
        private: repository.private
      }));
    } catch (error) {
      discoveryError =
        error instanceof Error
          ? error.message
          : "GitHub repositories could not be loaded.";
    }
  }

  const currentRepository = project.repository_full_name
    ? {
        fullName: project.repository_full_name,
        url: project.repository_url,
        defaultBranch: project.repository_default_branch
      }
    : null;

  return (
    <main className="settings-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER AI</div>
            <div className="brand-subtitle">PROJECT SOURCE CONTROL</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}`}>
            Return to project
          </Link>
          <Link className="button" href="/settings/connections">
            Connections
          </Link>
        </div>
      </header>

      <section className="settings-intro">
        <span className="panel-label">{project.name}</span>
        <h1>Choose the project&apos;s source of truth</h1>
        <p>
          Ziepher verifies the connected GitHub account can write to the selected
          repository before saving the binding. Future build automation can then
          create isolated branches and pull requests without touching production
          directly.
        </p>
      </section>

      <section className="billing-shell">
        <ProjectRepositoryPicker
          projectId={projectId}
          repositories={repositories}
          currentRepository={currentRepository}
          discoveryError={discoveryError}
        />
      </section>
    </main>
  );
}
