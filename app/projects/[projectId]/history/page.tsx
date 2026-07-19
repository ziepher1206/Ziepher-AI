import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { RestoreVersionButton } from "./history-actions";

type Props = { params: Promise<{ projectId: string }> };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function ProjectHistoryPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const [projectResult, versionsResult, buildsResult, deploymentsResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id,name,current_version,status")
        .eq("id", projectId)
        .single(),
      supabase
        .from("project_versions")
        .select("id,version,summary,commit_sha,created_at")
        .eq("project_id", projectId)
        .order("version", { ascending: false }),
      supabase
        .from("build_jobs")
        .select(
          "id,status,quality_mode,model_provider,model_name,finalized_credits,failure_message,created_at,completed_at"
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("deployments")
        .select(
          "id,provider,environment,status,url,failure_message,created_at,completed_at"
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50)
    ]);

  if (projectResult.error || !projectResult.data) notFound();

  const project = projectResult.data;
  const versions = versionsResult.data ?? [];
  const builds = buildsResult.data ?? [];
  const deployments = deploymentsResult.data ?? [];

  return (
    <main className="history-page">
      <header className="projects-header">
        <div>
          <p className="panel-label">Project history</p>
          <h1>{project.name}</h1>
          <p>
            Current version v{project.current_version} · {project.status}
          </p>
        </div>
        <div className="inline-actions">
          <Link className="button primary" href={`/projects/${projectId}`}>
            Return to studio
          </Link>
          <a className="button" href={`/api/projects/${projectId}/source`}>
            Download source
          </a>
        </div>
      </header>

      <section className="history-section">
        <div className="section-heading">
          <div>
            <p className="panel-label">Safe recovery</p>
            <h2>Versions</h2>
          </div>
          <span>{versions.length} checkpoints</span>
        </div>
        <div className="history-list">
          {versions.map((version) => (
            <article className="history-row" key={version.id}>
              <div>
                <strong>Version {version.version}</strong>
                <p>{version.summary}</p>
                <small>{formatDate(version.created_at)}</small>
              </div>
              <div className="history-row-actions">
                {version.version === project.current_version ? (
                  <span className="status-pill free">Current</span>
                ) : (
                  <RestoreVersionButton
                    projectId={projectId}
                    version={version.version}
                  />
                )}
              </div>
            </article>
          ))}
          {!versions.length ? <p>No successful checkpoints yet.</p> : null}
        </div>
      </section>

      <section className="history-section">
        <div className="section-heading">
          <div>
            <p className="panel-label">Quality pipeline</p>
            <h2>Builds</h2>
          </div>
          <span>{builds.length} recent jobs</span>
        </div>
        <div className="history-list">
          {builds.map((build) => (
            <article className="history-row" key={build.id}>
              <div>
                <strong>{build.status}</strong>
                <p>
                  {build.quality_mode} ·{" "}
                  {build.model_provider ?? "pending"}/
                  {build.model_name ?? "pending"} ·{" "}
                  {build.finalized_credits ?? 0} credits
                </p>
                {build.failure_message ? (
                  <small>{build.failure_message}</small>
                ) : (
                  <small>{formatDate(build.completed_at ?? build.created_at)}</small>
                )}
              </div>
            </article>
          ))}
          {!builds.length ? <p>No builds yet.</p> : null}
        </div>
      </section>

      <section className="history-section">
        <div className="section-heading">
          <div>
            <p className="panel-label">Launch trail</p>
            <h2>Deployments</h2>
          </div>
          <span>{deployments.length} recent deployments</span>
        </div>
        <div className="history-list">
          {deployments.map((deployment) => (
            <article className="history-row" key={deployment.id}>
              <div>
                <strong>
                  {deployment.environment} · {deployment.status}
                </strong>
                <p>{deployment.provider}</p>
                {deployment.failure_message ? (
                  <small>{deployment.failure_message}</small>
                ) : (
                  <small>
                    {formatDate(
                      deployment.completed_at ?? deployment.created_at
                    )}
                  </small>
                )}
              </div>
              {deployment.url ? (
                <a
                  className="button"
                  href={deployment.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open
                </a>
              ) : null}
            </article>
          ))}
          {!deployments.length ? <p>No deployments yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
