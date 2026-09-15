import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteAnalysisControls } from "@/components/site-analysis-controls";
import { SiteScanButton } from "@/components/site-scan-button";
import type { SiteAnalysis } from "@/lib/ai/site-analysis";
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
  deepAnalysis?: SiteAnalysis;
  deepAnalysisProvider?: string | null;
  deepAnalysisModel?: string | null;
  deepAnalyzedAt?: string | null;
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

function impactLabel(impact: "high" | "medium" | "low") {
  if (impact === "high") return "High impact";
  if (impact === "medium") return "Medium impact";
  return "Lower impact";
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
  const deepAnalysis = health.deepAnalysis;
  const budgetUsd = Number(process.env.ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD ?? "0");
  const liveAIAvailable =
    process.env.SITE_REFINER_PAID_AI_ENABLED === "true" &&
    Boolean(process.env.OPENAI_API_KEY?.trim()) &&
    Boolean(process.env.OPENAI_PLANNING_MODEL?.trim()) &&
    Boolean(process.env.OPENAI_PLANNING_MAX_OUTPUT_TOKENS?.trim()) &&
    Number.isFinite(budgetUsd) &&
    budgetUsd > 0;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">Z-LIFE BUILD</div>
            <div className="brand-subtitle">WEBSITE WORKSPACE</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/projects">All websites</Link>
          <Link className="button" href={`/projects/${projectId}/changes`}>Changes</Link>
          <Link className="button" href={`/projects/${projectId}/media`}>Photo library</Link>
          <Link className="button" href={`/projects/${projectId}/campaigns`}>Promotions</Link>
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
            <Link className="button primary" href={`/projects/${projectId}/changes`}>
              Request a change
            </Link>
            <Link className="button" href={`/projects/${projectId}/campaigns`}>
              Create promotion
            </Link>
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

        <section className="project-card" style={{ display: "grid", gap: 18 }}>
          <div>
            <p className="panel-label">Website health</p>
            <h2 style={{ fontSize: 44, margin: "8px 0" }}>{score === null ? "Not scored yet" : `${score}/100`}</h2>
            <p className="auth-copy" style={{ maxWidth: 820 }}>
              {score === null
                ? "Run the first scan to establish a baseline."
                : "Your scan results are shown immediately below. Build a detailed zero-cost report from the same evidence, or use guarded live AI later when the provider is connected and explicitly approved."}
            </p>
          </div>
          {project.scan_status === "complete" ? (
            <SiteAnalysisControls projectId={projectId} liveAIAvailable={liveAIAvailable} />
          ) : null}
        </section>

        {checks.length ? (
          <section>
            <p className="panel-label">Scan checks</p>
            <h2 style={{ margin: "6px 0 12px" }}>What the scanner found</h2>
            <div className="project-grid" style={{ marginTop: 0 }}>
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
            <ol style={{ display: "grid", gap: 14, paddingLeft: 22 }}>
              {recommendations.map((recommendation, index) => (
                <li key={recommendation}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <span>{recommendation}</span>
                    <div>
                      <Link
                        className="button"
                        href={{
                          pathname: `/projects/${projectId}/changes`,
                          query: {
                            source: "scan_recommendation",
                            reference: `scan-recommendation-${index + 1}`,
                            title: "Improve website recommendation",
                            instructions: recommendation
                          }
                        }}
                      >
                        Turn into change request
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p>Z-Life Build will turn detected gaps into reviewable improvement work instead of publishing changes automatically.</p>
          )}
        </section>

        {deepAnalysis ? (
          <section className="auth-card" style={{ maxWidth: "none" }}>
            <div className="project-card-top">
              <div>
                <p className="panel-label">Detailed website analysis</p>
                <h2 style={{ margin: "6px 0" }}>What to improve next</h2>
              </div>
              <span className="status-pill">
                {health.deepAnalysisProvider === "openai" ? "Live AI analysis" : "Zero-cost detailed report"}
              </span>
            </div>
            <p className="auth-copy" style={{ maxWidth: 900 }}>{deepAnalysis.summary}</p>
            {health.deepAnalyzedAt ? (
              <small>
                Analyzed {new Date(health.deepAnalyzedAt).toLocaleString()} · {health.deepAnalysisProvider ?? "deterministic"} · {health.deepAnalysisModel ?? "rules"}
              </small>
            ) : null}

            <div className="project-grid" style={{ marginTop: 18 }}>
              <article className="project-card">
                <p className="panel-label">Strengths</p>
                <ul style={{ paddingLeft: 20 }}>
                  {deepAnalysis.strengths.length ? deepAnalysis.strengths.map((item) => <li key={item}>{item}</li>) : <li>No foundational strengths were recorded yet.</li>}
                </ul>
              </article>
              <article className="project-card">
                <p className="panel-label">Risks</p>
                <ul style={{ paddingLeft: 20 }}>
                  {deepAnalysis.risks.length ? deepAnalysis.risks.map((item) => <li key={item}>{item}</li>) : <li>No first-pass risk flags remain.</li>}
                </ul>
              </article>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              {deepAnalysis.priorities.map((priority, index) => (
                <article className="project-card" key={`${priority.title}-${index}`}>
                  <div className="project-card-top">
                    <span className="status-pill">{impactLabel(priority.impact)}</span>
                    <span className="project-version">{priority.category}</span>
                  </div>
                  <h3>{priority.title}</h3>
                  <p>{priority.reason}</p>
                  <p><strong>Recommended change:</strong> {priority.recommendedChange}</p>
                  <Link
                    className="button"
                    href={{
                      pathname: `/projects/${projectId}/changes`,
                      query: {
                        source: "site_analysis",
                        reference: `site-analysis-${index + 1}`,
                        title: priority.title,
                        instructions: priority.recommendedChange
                      }
                    }}
                  >
                    Turn into change request
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="project-grid" style={{ marginTop: 0 }}>
          <article className="project-card">
            <p className="panel-label">Change pipeline</p>
            <h2>Request → preview → approval</h2>
            <p>Turn a recommendation or business request into a tracked website change before any AI or production action is allowed.</p>
            <Link className="button" href={`/projects/${projectId}/changes`} style={{ marginTop: 12 }}>
              Open change requests
            </Link>
          </article>

          <article className="project-card">
            <p className="panel-label">Promotions</p>
            <h2>Campaign drafts</h2>
            <p>Capture offers, dates, and intended channels before AI generation or publishing is authorized.</p>
            <Link className="button" href={`/projects/${projectId}/campaigns`} style={{ marginTop: 12 }}>
              Open promotions
            </Link>
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
            <p>Scanning and analysis are read-only. Proposed changes still go through versioning, checks, preview, and approval before production.</p>
          </article>

          <article className="project-card">
            <p className="panel-label">AI usage</p>
            <h2>Tracked by website</h2>
            <p>Model usage and provider cost records remain attached to this website project so underlying provider cost is visible separately from customer billing.</p>
            <Link className="button" href={`/projects/${projectId}/usage`} style={{ marginTop: 12 }}>
              Open usage & cost
            </Link>
          </article>

          <article className="project-card">
            <p className="panel-label">AI safety</p>
            <h2>Provider status</h2>
            <p>See whether OpenAI, model limits, and the monthly budget are configured before approving any live provider request.</p>
            <Link className="button" href={`/projects/${projectId}/ai-status`} style={{ marginTop: 12 }}>
              Open AI status
            </Link>
          </article>
        </section>

        <section className="project-card">
          <p className="panel-label">Advanced build rails</p>
          <h2>Existing safety infrastructure is still available</h2>
          <div className="inline-actions">
            <Link className="button primary" href={`/projects/${projectId}/changes`}>Open change pipeline</Link>
            <Link className="button" href={`/projects/${projectId}/studio`}>AI workspace</Link>
            <Link className="button" href={`/projects/${projectId}/source-control`}>Build review</Link>
            <Link className="button" href={`/projects/${projectId}/settings/repository`}>GitHub repository</Link>
            <Link className="button" href={`/projects/${projectId}/settings/deployment`}>Vercel target</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
