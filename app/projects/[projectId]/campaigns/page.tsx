import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CampaignDraftForm } from "@/components/campaign-draft-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ projectId: string }> };

type Campaign = {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  instructions: string | null;
  channels: string[];
  starts_at: string | null;
  ends_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
};

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

export default async function CampaignsPage({ params }: Props) {
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

  const { data: campaigns, error: campaignError } = await supabase
    .from("marketing_campaigns")
    .select("id,name,campaign_type,status,instructions,channels,starts_at,ends_at,approved_at,published_at,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (campaignError) throw campaignError;

  const domain = project.primary_domain ?? project.source_domain;
  const rows = (campaigns ?? []) as Campaign[];

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-title">SITEREFINER</div>
            <div className="brand-subtitle">PROMOTIONS & CAMPAIGNS</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}`}>Website overview</Link>
          <Link className="button" href="/projects">All websites</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <div>
          <p className="panel-label">{project.business_name ?? project.name}</p>
          <h1 style={{ margin: "6px 0 10px" }}>Promotions and marketing requests</h1>
          <p className="auth-copy" style={{ maxWidth: 820 }}>
            {domain ? `${domain} · ` : ""}Create the campaign request once, then SiteRefiner can use it as the source for website and social creative after an AI-generation step is explicitly started and reviewed.
          </p>
        </div>

        <CampaignDraftForm projectId={projectId} workspaceId={project.workspace_id} />

        <section className="project-card">
          <p className="panel-label">Current safety state</p>
          <h2>Drafting only</h2>
          <p>
            Campaign records can be created now, but this workspace does not currently call paid AI, publish a website change, post to social profiles, or start paid advertising. Those actions will remain separate approval-gated steps.
          </p>
        </section>

        <section>
          <p className="panel-label">Campaign history</p>
          {rows.length ? (
            <div className="project-grid" style={{ marginTop: 12 }}>
              {rows.map((campaign) => (
                <article className="project-card" key={campaign.id}>
                  <div className="project-card-top">
                    <span className="status-pill">{campaign.status}</span>
                    <span className="project-version">{campaign.channels.join(" + ") || "no channel"}</span>
                  </div>
                  <h2>{campaign.name}</h2>
                  <p>{campaign.instructions ?? "No instructions saved."}</p>
                  <p>
                    {dateLabel(campaign.starts_at)} → {dateLabel(campaign.ends_at)}
                  </p>
                  <small>
                    Created {new Date(campaign.created_at).toLocaleString()}
                    {campaign.published_at ? ` · Published ${new Date(campaign.published_at).toLocaleString()}` : " · Not published"}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <section className="empty-projects" style={{ marginTop: 12 }}>
              <h2>No campaigns yet</h2>
              <p>Save the first promotion request above. It remains a draft until later generation and approval steps are added.</p>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
