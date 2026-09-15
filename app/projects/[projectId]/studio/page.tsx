import Link from "next/link";
import { redirect } from "next/navigation";
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
      <div
        style={{
          position: "fixed",
          right: 18,
          bottom: 52,
          zIndex: 30,
          display: "grid",
          gap: 8,
          width: "min(310px, calc(100vw - 36px))",
          maxHeight: "calc(100vh - 76px)",
          overflowY: "auto"
        }}
      >
        {hasBuiltPreview ? <ProjectVisualQualityPanel projectId={projectId} /> : null}
        {hasBuiltPreview ? (
          <Link className="button primary" href={`/projects/${projectId}/domains`} style={{ textDecoration: "none" }}>
            Choose Domain
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
