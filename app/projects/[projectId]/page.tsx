import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteScanButton } from "@/components/site-scan-button";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

type HealthCheck = {
  key?: string;
  label?: string;
  passed?: boolean;
  detail?: string;
};

type WebsiteHealth = {
  score?: number;
  scannedUrl?: string;
  title?: string | null;
  description?: string | null;
  checks?: HealthCheck[];
  recommendations?: string[];
};

function scanLabel(status: string | null) {
  switch (status) {
    case "pending": return "Ready to scan";
    case "scanning": return "Scanning";
    case "complete": return "Scan complete";
    case "failed": return "Scan needs attention";
    default: return "Not scanned";
  }
}

export default async function ProjectPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id,name,business_name,source_domain,primary_domain,scan_status,last_scanned_at,website_health,status,current_version,preview_url,updated_at")
    .eq("id", projectId)
    .single();

  if (error || !project) notFound();

  const domain = project.primary_domain ?? project.source_domain;
  const health = (project.website_health ?? {}) as WebsiteHealth;
  const checks = Array.isArray(health.checks) ? health.checks : [];
  const recommendations = Array.isArray(health.recommendations) ? health.recommendations : [];
  const score = typeof health.score === "number" ? health.score : null;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-title">SITEREFINER</div>
            <div className="brand-subtitle">WEBSITE WORKSPACE</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/projects">All websites</Link>
          <Link className="button" href={`/projects/${projectId}/media`}>Photo library</Link>
          <Link className="button" href={`/projects/${projectId}/usage`}>Usage & cost</Link>
          <Link className="button" href={`/projects/${projectId}/studio`}>AI workspace</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <section className="project-card" style={{ display: "grid", gap: 16 }}>
          <div className="project-card-top">
            <span className="status-pill">{scanLabel(project.scan_status)}</span>
            <span className="project-version">v{project.current_version}</span>
          </div>
          <div>
            <p className="panel-label">Business website</p>
            <h1 style={{ margin: "6px 0" }}>{project.business_name ?? project.name}</h1>
            <p className="auth-copy">{domain ?? "No domain connected"}</p>
          </div>
          <div className="inline-actions">
            {domain ? <SiteScanButton projectId={projectId} /> : null}
            <Link className="button" href={`/projects/${projectId}/media`}>
              Manage photos
            </Link>
            <Link className="button" href={`/projects/${projectId}/usage`}>
              View usage & cost
            </Link>
            {domain ? (
              <a className="button" href={`https://${domain}`} target="_blank" rel="noreferrer">
                Open current website
              </a>
            ) : null}
            {project.preview_url ? (
              <a className="button" href={project.preview_url} target="_blank" rel="noreferrer">
                Open latest preview
              </a>
            ) : null}
          </div>
          {project.last_scanned_at ? (
            <small>Last scanned {new Date(project.last_scanned_at).toLocaleString()}</small>
          ) : (
            <small>The scanner reads the public homepage only. It does not publish or change anything.</small>
          )}
        </section>

        <section className="project-grid" style={{ marginTop: 0 }}>
          <article className="project-card">
            <p className="panel-label">Website health</p>
            <h2>{score === null ? "Not scored yet" : `${score}/100`}</h2>
            <p>
              {score === null
                ? "Run the first scan to establish a baseline."
                : "This first-pass score covers foundational homepage signals. Deeper SEO, accessibility, CRO, content, and performance analysis will build on it."}
            </p>
          </article>

          <article className="project-card">
            <p className="panel-label">Business media</p>
            <h2>Private photo library</h2>
            <p>Keep business-owned website photos separated by client and project before they are used in an approved build.</p>
            <Link className="button" href={`/projects/${projectId}/media`} style={{ marginTop: 12 }}>
              Open photo library
            </Link>
          </article>

          <article className="project-card">
            <p className="panel-label">Publishing safety</p>
            <h2>Approval required</h2>
            <p>Scanning is read-only. Proposed changes still go through versioning, checks, preview, and approval before production.</p>
          </article>

          <article className="project-card">
            <p className="panel-label">AI usage</p>
            <h2>Tracked by website</h2>
            <p>Model usage and provider cost records remain attached to this website project so customer usage can be reported separately.</p>
            <Link className="button" href={`/projects/${projectId}/usage`} style={{ marginTop: 12 }}>
              Open usage & cost
            </Link>
          </article>
        </section>

        {checks.length ? (
          <section>
            <p className="panel-label">Scan checks</p>
            <div className="project-grid" style={{ marginTop: 12 }}>
              {checks.map((check, index) => (
                <article className="project-card" key={check.key ?? `${check.label}-${index}`}>
                  <div className="project-card-top">
                    <span className="status-pill">{check.passed ? "Pass" : "Improve"}</span>
                  </div>
                  <h2>{check.label ?? "Website check"}</h2>
                  <p>{check.detail ?? "No detail available."}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="project-card">
          <p className="panel-label">Recommended next changes</p>
          <h2>{recommendations.length ? "Prioritized from this scan" : "Recommendations appear after scanning"}</h2>
          {recommendations.length ? (
            <ol style={{ display: "grid", gap: 10, paddingLeft: 22 }}>
              {recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}
            </ol>
          ) : (
            <p>SiteRefiner will turn detected gaps into reviewable improvement work instead of publishing changes automatically.</p>
          )}
        </section>

        <section className="project-card">
          <p className="panel-label">Advanced build rails</p>
          <h2>Existing safety infrastructure is still available</h2>
          <div className="inline-actions">
            <Link className="button primary" href={`/projects/${projectId}/studio`}>Open AI workspace</Link>
            <Link className="button" href={`/projects/${projectId}/source-control`}>Build review</Link>
            <Link className="button" href={`/projects/${projectId}/settings/repository`}>GitHub repository</Link>
            <Link className="button" href={`/projects/${projectId}/settings/deployment`}>Vercel target</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
