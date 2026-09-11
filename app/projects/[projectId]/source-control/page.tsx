import Link from "next/link";
import { redirect } from "next/navigation";
import { SourceControlReviewPanel } from "@/components/source-control-review-panel";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

export default async function SourceControlReviewPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  return (
    <main className="settings-page">
      <section className="settings-intro">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER AI</div>
            <div className="brand-subtitle">BUILD CONTROL</div>
          </div>
        </div>
        <div className="inline-actions" style={{ marginTop: 30 }}>
          <Link className="button" href={`/projects/${projectId}`}>
            Back to project
          </Link>
          <Link className="button" href={`/projects/${projectId}/settings/repository`}>
            Repository settings
          </Link>
        </div>
      </section>

      <SourceControlReviewPanel projectId={projectId} />
    </main>
  );
}
