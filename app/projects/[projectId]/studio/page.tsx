import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioShell } from "@/components/studio-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectStudioPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

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
          maxWidth: 220
        }}
      >
        <Link className="button primary" href={`/projects/${projectId}/media`} style={{ textDecoration: "none" }}>
          Photos & design references
        </Link>
        <small style={{ color: "#8faaa7", lineHeight: 1.35 }}>
          Upload screenshots or mockups before building when you want the visual result to closely match a reference.
        </small>
        <Link className="button" href={`/projects/${projectId}`} style={{ textDecoration: "none" }}>
          Website overview
        </Link>
        <Link className="button" href={`/projects/${projectId}/ai-status`} style={{ textDecoration: "none" }}>
          AI status
        </Link>
        <Link className="button" href={`/projects/${projectId}/source-control`} style={{ textDecoration: "none" }}>
          Build review
        </Link>
        <Link className="button" href={`/projects/${projectId}/settings/repository`} style={{ textDecoration: "none" }}>
          GitHub repository
        </Link>
        <Link className="button" href={`/projects/${projectId}/settings/deployment`} style={{ textDecoration: "none" }}>
          Vercel target
        </Link>
      </div>
      <StudioShell authenticated userEmail={user.email} initialProjectId={projectId} />
    </>
  );
}
