import Link from "next/link";
import { redirect } from "next/navigation";
import { BuilderProgress } from "@/components/builder-progress";
import { ProjectVisualQualityPanel } from "@/components/project-visual-quality-panel";
import { StudioShell } from "@/components/studio-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectStudioPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in?next=/projects");

  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/projects/${projectId}/studio`)}`);

  const { data: project } = await supabase
    .from("projects")
    .select("id,current_version")
    .eq("id", projectId)
    .maybeSingle();
  const hasBuiltPreview = Number(project?.current_version ?? 0) > 0;

  return (
    <>
      <style>{`
        /* Keep technical deployment actions out of the normal builder path.
           The visible release flow is Preview → Domain → Publish Readiness. */
        .preview-toolbar .inline-actions > button:has(+ button.primary),
        .preview-toolbar .inline-actions > button.primary {
          display: none;
        }

        @media (max-width: 720px) {
          .zlife-studio-progress {
            position: sticky !important;
            top: 0 !important;
            left: auto !important;
            transform: none !important;
            z-index: 32 !important;
            width: auto !important;
            margin: 0 10px;
            padding-top: 6px;
          }

          .zlife-studio-actions {
            position: sticky !important;
            top: 72px !important;
            right: auto !important;
            bottom: auto !important;
            z-index: 31 !important;
            width: auto !important;
            max-height: 38vh !important;
            margin: 8px 10px 12px;
            padding: 8px;
            border: 1px solid rgba(127,255,212,.16);
            border-radius: 14px;
            background: rgba(2,14,16,.92);
            backdrop-filter: blur(16px);
          }
        }
      `}</style>

      <div
        className="zlife-studio-progress"
        style={{
          position: "fixed",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 31,
          width: "min(920px, calc(100vw - 28px))"
        }}
      >
        <BuilderProgress projectId={projectId} currentStage={3} />
      </div>

      <div
        className="zlife-studio-actions"
        style={{
          position: "fixed",
          right: 18,
          bottom: 52,
          zIndex: 30,
          display: "grid",
          gap: 8,
          width: "min(310px, calc(100vw - 36px))",
          maxHeight: "calc(100vh - 148px)",
          overflowY: "auto"
        }}
      >
        {hasBuiltPreview ? <ProjectVisualQualityPanel projectId={projectId} /> : null}
        {hasBuiltPreview ? (
          <Link className="button primary" href={`/projects/${projectId}/domains`} style={{ textDecoration: "none" }}>
            Continue to Domain
          </Link>
        ) : null}
        <Link className={hasBuiltPreview ? "button" : "button primary"} href={`/projects/${projectId}/changes`} style={{ textDecoration: "none" }}>
          Tell Z-Life What to Change
        </Link>
        <Link className="button" href={`/projects/${projectId}/media`} style={{ textDecoration: "none" }}>
          Add Photos & References
        </Link>
        <Link className="button" href="/projects" style={{ textDecoration: "none" }}>
          All Projects
        </Link>
        <details style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(0,0,0,.28)", color: "#8faaa7", fontSize: 12 }}>
          <summary style={{ cursor: "pointer", color: "#b8d2cf" }}>Advanced details</summary>
          <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
            <small>Deployment controls are kept here so the main builder stays simple. Production release still requires explicit approval.</small>
            <Link href={`/projects/${projectId}`} style={{ color: "#7fffd4" }}>Project overview</Link>
            <Link href={`/projects/${projectId}/ai-status`} style={{ color: "#7fffd4" }}>AI status</Link>
            <Link href={`/projects/${projectId}/source-control`} style={{ color: "#7fffd4" }}>Build review</Link>
            <Link href={`/projects/${projectId}/settings/repository`} style={{ color: "#7fffd4" }}>GitHub repository</Link>
            <Link href={`/projects/${projectId}/settings/deployment`} style={{ color: "#7fffd4" }}>Deployment settings</Link>
          </div>
        </details>
      </div>
      <StudioShell authenticated userEmail={user.email} initialProjectId={projectId} />
    </>
  );
}
