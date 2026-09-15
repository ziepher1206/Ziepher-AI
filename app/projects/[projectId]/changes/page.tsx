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
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">Z-LIFE BUILDER</div>
            <div className="brand-subtitle">REFINE YOUR BUILD</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button primary" href={`/projects/${projectId}/studio`}>
            Back to live preview
          </Link>
          <Link className="button" href={`/projects/${projectId}/media`}>
            Photos & references
          </Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <div style={{ maxWidth: 900 }}>
          <p className="panel-label">{project.business_name ?? project.name}</p>
          <h1 style={{ margin: "6px 0 10px", fontSize: "clamp(34px,6vw,64px)", lineHeight: .98 }}>
            Keep improving the same build.
          </h1>
          <p className="auth-copy" style={{ maxWidth: 800, fontSize: 17, lineHeight: 1.65 }}>
            {domain ? `${domain} · ` : ""}Tell Z-Life what looks wrong, what should move, which photo to use, what should feel stronger, or how closely you want it to match your reference. Z-Life keeps the request attached to this project instead of making you start over.
          </p>
        </div>

        <SiteChangeRequestWorkflow
          projectId={projectId}
          rows={rows ?? []}
          initialSourceType={sourceType(query.source)}
          initialSourceReference={query.reference?.slice(0, 500) ?? ""}
          initialTitle={query.title?.slice(0, 160) ?? ""}
          initialInstructions={query.instructions?.slice(0, 12000) ?? ""}
          aiGenerationEnabled={aiGenerationEnabled}
          buildExecutionEnabled={buildExecutionEnabled}
        />

        <details className="project-card">
          <summary style={{ cursor: "pointer" }}>Advanced build safeguards</summary>
          <div className="project-grid" style={{ marginTop: 16 }}>
            <article className="project-card">
              <p className="panel-label">AI generation</p>
              <h2>{aiGenerationEnabled ? "Available after approval" : "Provider calls currently locked"}</h2>
              <p>Saving a refinement never calls an AI provider by itself.</p>
            </article>
            <article className="project-card">
              <p className="panel-label">Preview build</p>
              <h2>{buildExecutionEnabled ? "Available after proposal approval" : "Build provider usage currently locked"}</h2>
              <p>A refinement proposal and a new preview build remain separate approval steps.</p>
            </article>
            <article className="project-card">
              <p className="panel-label">Production</p>
              <h2>Never automatic</h2>
              <p>Refinements go through preview first. Production publishing remains a separate release action.</p>
            </article>
          </div>
        </details>
      </section>
    </main>
  );
}
