/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteMediaUpload } from "@/components/site-media-upload";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ projectId: string }> };

type MediaAsset = {
  id: string;
  display_name: string;
  mime_type: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  usage_status: string;
  ai_tags: string[] | null;
  ai_summary: string | null;
  created_at: string;
};

export default async function MediaLibraryPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,workspace_id,name,business_name,primary_domain,source_domain")
    .eq("id", projectId)
    .single();

  if (projectError || !project?.workspace_id) notFound();

  const { data: assets, error: assetError } = await supabase
    .from("media_assets")
    .select("id,display_name,mime_type,storage_bucket,storage_path,usage_status,ai_tags,ai_summary,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (assetError) throw assetError;

  const media = await Promise.all(
    ((assets ?? []) as MediaAsset[]).map(async (asset) => {
      if (!asset.storage_path) return { ...asset, signedUrl: null as string | null };
      const bucket = asset.storage_bucket ?? "site-media";
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(asset.storage_path, 3600);
      return { ...asset, signedUrl: data?.signedUrl ?? null };
    })
  );

  const domain = project.primary_domain ?? project.source_domain;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">Z-LIFE BUILD</div>
            <div className="brand-subtitle">BUSINESS PHOTO LIBRARY</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}`}>
            Website overview
          </Link>
          <Link className="button" href="/projects">
            All websites
          </Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <div>
          <p className="panel-label">{project.business_name ?? project.name}</p>
          <h1 style={{ margin: "6px 0 10px" }}>Photos approved for this business</h1>
          <p className="auth-copy" style={{ maxWidth: 760 }}>
            Keep website-ready photos tied to this business instead of mixing files across clients. {domain ? `Current website: ${domain}.` : ""}
          </p>
        </div>

        <SiteMediaUpload projectId={projectId} workspaceId={project.workspace_id} />

        <section>
          <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p className="panel-label">Library</p>
              <h2 style={{ margin: "6px 0" }}>{media.length} photo{media.length === 1 ? "" : "s"}</h2>
            </div>
            <small>AI photo tagging and ranking are not active yet.</small>
          </div>

          {media.length ? (
            <div className="project-grid" style={{ marginTop: 14 }}>
              {media.map((asset) => (
                <article className="project-card" key={asset.id} style={{ overflow: "hidden" }}>
                  {asset.signedUrl ? (
                    <div style={{ aspectRatio: "4 / 3", overflow: "hidden", borderRadius: 12, marginBottom: 14, background: "rgba(255,255,255,.04)" }}>
                      <img
                        src={asset.signedUrl}
                        alt={asset.display_name}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                  ) : null}
                  <div className="project-card-top">
                    <span className="status-pill">{asset.usage_status}</span>
                    <span className="project-version">{asset.mime_type ?? "image"}</span>
                  </div>
                  <h3 style={{ overflowWrap: "anywhere" }}>{asset.display_name}</h3>
                  <small>Uploaded {new Date(asset.created_at).toLocaleDateString()}</small>
                </article>
              ))}
            </div>
          ) : (
            <section className="empty-projects" style={{ marginTop: 14 }}>
              <h2>No business photos yet</h2>
              <p>Upload real business-owned photos above. Z-Life Build can later recommend which approved images fit specific pages and campaigns.</p>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
