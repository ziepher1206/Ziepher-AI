import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getVercelProjectDomain } from "@/lib/deployment/vercel-project-domains";
import { isSupabaseConfigured } from "@/lib/env";
import { getProviderConnection } from "@/lib/provider-connections/store";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

type Check = {
  label: string;
  ready: boolean;
  detail: string;
  href: string;
  action: string;
};

function CheckCard({ check }: { check: Check }) {
  return (
    <article className="project-card" style={{ display: "grid", gap: 10 }}>
      <div className="project-card-top">
        <h2 style={{ margin: 0 }}>{check.label}</h2>
        <span className={`status-pill ${check.ready ? "free" : ""}`}>
          {check.ready ? "Ready" : "Needs attention"}
        </span>
      </div>
      <p>{check.detail}</p>
      {!check.ready ? (
        <div>
          <Link className="button" href={check.href}>{check.action}</Link>
        </div>
      ) : null}
    </article>
  );
}

export default async function PublishReadinessPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in?next=/projects");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/projects/${projectId}/publish`)}`);
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id,name,business_name,workspace_id,current_version,preview_url,primary_domain,source_domain,vercel_project_id,vercel_project_name,vercel_org_id,status")
    .eq("id", projectId)
    .single();
  if (error || !project) notFound();

  const hasPreview = Number(project.current_version ?? 0) > 0 && Boolean(project.preview_url);
  const domain = project.primary_domain ?? null;
  const hasDeploymentTarget = Boolean(project.vercel_project_id || project.vercel_project_name);
  let domainVerified = false;
  let domainCheckDetail = domain
    ? "The domain is attached in Z-Life, but provider verification has not been confirmed on this screen yet."
    : "Choose a domain or connect one you already own.";

  if (domain && project.workspace_id && hasDeploymentTarget) {
    const connection = await getProviderConnection(project.workspace_id, "vercel");
    if (connection?.status === "connected" && connection.accessToken?.trim()) {
      try {
        const teamId = project.vercel_org_id?.startsWith("team_")
          ? project.vercel_org_id
          : connection.provider_account_id?.startsWith("team_")
            ? connection.provider_account_id
            : null;
        const status = await getVercelProjectDomain({
          accessToken: connection.accessToken,
          projectIdOrName: project.vercel_project_id ?? project.vercel_project_name,
          domain,
          teamId
        });
        domainVerified = status.verified;
        domainCheckDetail = status.verified
          ? `${domain} is attached and verified with the selected deployment target.`
          : `${domain} is attached, but DNS/provider verification still needs to finish.`;
      } catch {
        domainCheckDetail = `${domain} is saved to this project. Open the Domain step to recheck provider verification.`;
      }
    }
  }

  const checks: Check[] = [
    {
      label: "Preview",
      ready: hasPreview,
      detail: hasPreview
        ? `Build v${project.current_version} has a reviewable preview.`
        : "A completed preview is required before production release.",
      href: `/projects/${projectId}/studio`,
      action: "Return to builder"
    },
    {
      label: "Design review",
      ready: hasPreview,
      detail: hasPreview
        ? "The studio includes zero-cost Design Quality findings and the plain-language refinement path. Review those before release."
        : "Design Quality becomes available after the first completed preview.",
      href: `/projects/${projectId}/studio`,
      action: "Review design"
    },
    {
      label: "Domain",
      ready: Boolean(domain) && domainVerified,
      detail: domainCheckDetail,
      href: `/projects/${projectId}/domains`,
      action: domain ? "Check domain" : "Choose domain"
    },
    {
      label: "Deployment target",
      ready: hasDeploymentTarget,
      detail: hasDeploymentTarget
        ? `Vercel target ${project.vercel_project_name ?? project.vercel_project_id} is selected.`
        : "Choose the Vercel project that will receive the approved production release.",
      href: `/projects/${projectId}/settings/deployment`,
      action: "Choose deployment target"
    }
  ];

  const allReady = checks.every((check) => check.ready);

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">Z-LIFE BUILD</div>
            <div className="brand-subtitle">PUBLISH READINESS</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}/studio`}>Back to preview</Link>
          <Link className="button" href={`/projects/${projectId}/domains`}>Domain</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <section className="project-card" style={{ display: "grid", gap: 12 }}>
          <p className="panel-label">Step 5 of 5 · Publish</p>
          <h1 style={{ margin: 0 }}>{project.business_name ?? project.name}</h1>
          <h2 style={{ margin: 0 }}>{allReady ? "Everything required is ready for approval." : "Finish the items below before production."}</h2>
          <p>
            This page is a readiness check only. It cannot publish the website/app, spend credits, buy a domain, or change DNS.
          </p>
        </section>

        <section className="project-grid" style={{ marginTop: 0 }}>
          {checks.map((check) => <CheckCard check={check} key={check.label} />)}
        </section>

        <section className="project-card" style={{ display: "grid", gap: 12 }}>
          <div className="project-card-top">
            <div>
              <p className="panel-label">Production release</p>
              <h2 style={{ margin: "4px 0" }}>{allReady ? "Ready for explicit approval" : "Locked until ready"}</h2>
            </div>
            <span className={`status-pill ${allReady ? "free" : ""}`}>{allReady ? "Approval required" : "Not ready"}</span>
          </div>
          <p>
            Z-Life will keep the actual production deployment as a separate, explicit approval action. No release is triggered from this checklist.
          </p>
          <button className="button primary" type="button" disabled>
            Production publish requires approval
          </button>
        </section>
      </section>
    </main>
  );
}
