import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteChangeRequestWorkflow } from "@/components/site-change-request-workflow";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    source?: string;
    reference?: string;
    title?: string;
    instructions?: string;
  }>;
};

type SourceType = "manual" | "scan_recommendation" | "campaign";

function sourceType(value?: string): SourceType {
  if (value === "scan_recommendation" || value === "campaign") return value;
  return "manual";
}

export default async function ChangesPage({ params, searchParams }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,business_name,primary_domain,source_domain")
    .eq("id", projectId)
    .single();
  if (projectError || !project) notFound();

  const { data: rows, error: requestError } = await supabase
    .from("site_change_requests")
    .select("id,source_type,source_reference,title,instructions,status,ai_generation_approved,ai_generation_approved_at,spec_version_id,build_job_id,source_control_run_id,preview_url,published_at,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (requestError) throw requestError;

  const domain = project.primary_domain ?? project.source_domain;
  const aiGenerationEnabled = process.env.SITE_REFINER_PAID_AI_ENABLED === "true";
  const buildExecutionEnabled = process.env.SITE_REFINER_PAID_BUILDS_ENABLED === "true";

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-title">SITEREFINER</div>
            <div className="brand-subtitle">CHANGE REQUESTS</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}`}>Website overview</Link>
          <Link className="button" href={`/projects/${projectId}/source-control`}>Build review</Link>
          <Link className="button" href="/projects">All websites</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <div>
          <p className="panel-label">{project.business_name ?? project.name}</p>
          <h1 style={{ margin: "6px 0 10px" }}>Request, review, then publish</h1>
          <p className="auth-copy" style={{ maxWidth: 860 }}>
            {domain ? `${domain} · ` : ""}SiteRefiner change requests are the handoff between recommendations or business requests and the existing versioned build, QA, preview, approval, and source-control pipeline.
          </p>
        </div>

        <section className="project-grid" style={{ marginTop: 0 }}>
          <article className="project-card">
            <p className="panel-label">AI proposal gate</p>
            <h2>{aiGenerationEnabled ? "Provider generation enabled" : "Provider calls locked"}</h2>
            <p>Saving and approving a request never bypasses the owner-level AI provider switch.</p>
          </article>
          <article className="project-card">
            <p className="panel-label">Build execution gate</p>
            <h2>{buildExecutionEnabled ? "Build execution enabled" : "Build provider usage locked"}</h2>
            <p>Even after a proposal exists, build execution has its own owner-level switch before credits or provider work can begin.</p>
          </article>
          <article className="project-card">
            <p className="panel-label">Production gate</p>
            <h2>Separate approval required</h2>
            <p>Builds move through checks and preview first. Production release still uses the existing exact-SHA approval workflow.</p>
          </article>
        </section>

        <SiteChangeRequestWorkflow
          projectId={projectId}
          rows={(rows ?? [])}
          initialSourceType={sourceType(query.source)}
          initialSourceReference={query.reference?.slice(0, 500) ?? ""}
          initialTitle={query.title?.slice(0, 160) ?? ""}
          initialInstructions={query.instructions?.slice(0, 12000) ?? ""}
          aiGenerationEnabled={aiGenerationEnabled}
          buildExecutionEnabled={buildExecutionEnabled}
        />
      </section>
    </main>
  );
}
