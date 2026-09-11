import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioShell } from "@/components/studio-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  return (
    <>
      <Link
        className="button"
        href={`/projects/${projectId}/settings/repository`}
        style={{
          position: "fixed",
          right: 18,
          bottom: 52,
          zIndex: 30,
          textDecoration: "none"
        }}
      >
        GitHub repository
      </Link>
      <StudioShell
        authenticated
        userEmail={user.email}
        initialProjectId={projectId}
      />
    </>
  );
}
