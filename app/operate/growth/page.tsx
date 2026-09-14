import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function OperateGrowthPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const [
    { data: leads, error: leadsError },
    { data: jobs, error: jobsError },
    { data: invoices, error: invoicesError },
    { data: spend, error: spendError },
    { data: reviews, error: reviewsError },
    { data: projects, error: projectsError },
    { data: profile, error: profileError }
  ] = await Promise.all([
    supabase.from("leads").select("id,source").eq("workspace_id", workspaceId),
    supabase.from("jobs").select("id,lead_id,title,status").eq("workspace_id", workspaceId),
    supabase.from("invoices").select("id,job_id,total_cents,paid_cents,status").eq("workspace_id", workspaceId),
    supabase.from("marketing_source_spend").select("source,amount_cents").eq("workspace_id", workspaceId),
    supabase.from("operate_review_requests").select("id,job_id,status,subject,message,review_url,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("projects").select("id,name,business_name,primary_domain,source_domain,status").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(20),
    supabase.from("workspace_business_profiles").select("business_name,review_url,website_url").eq("workspace_id", workspaceId).maybeSingle()
  ]);
  if (leadsError) throw leadsError;
  if (jobsError) throw jobsError;
  if (invoicesError) throw invoicesError;
  if (spendError) throw spendError;
  if (reviewsError) throw reviewsError;
  if (projectsError) throw projectsError;
  if (profileError) throw profileError;

  const sourceByLead = new Map((leads ?? []).map((lead) => [lead.id, lead.source?.trim() || "Unknown"]));
  const sourceByJob = new Map((jobs ?? []).map((job) => [job.id, job.lead_id ? sourceByLead.get(job.lead_id) ?? "Unknown" : "Unknown"]));
  const stats = new Map<string, { leads: number; jobs: number; collected: number; spend: number }>();
  const get = (source: string) => {
    const existing = stats.get(source);
    if (existing) return existing;
    const row = { leads: 0, jobs: 0, collected: 0, spend: 0 };
    stats.set(source, row);
    return row;
  };
  for (const lead of leads ?? []) get(lead.source?.trim() || "Unknown").leads += 1;
  for (const job of jobs ?? []) get(sourceByJob.get(job.id) ?? "Unknown").jobs += 1;
  for (const invoice of invoices ?? []) {
    const source = invoice.job_id ? sourceByJob.get(invoice.job_id) ?? "Unknown" : "Unknown";
    get(source).collected += invoice.paid_cents ?? 0;
  }
  for (const entry of spend ?? []) get(entry.source?.trim() || "Unknown").spend += entry.amount_cents ?? 0;

  const rankedSources = Array.from(stats.entries())
    .map(([source, row]) => ({ source, ...row, roi: row.spend > 0 ? ((row.collected - row.spend) / row.spend) * 100 : null }))
    .sort((a, b) => b.collected - a.collected || b.jobs - a.jobs || b.leads - a.leads);
  const bestSource = rankedSources.find((row) => row.collected > 0) ?? rankedSources[0] ?? null;
  const completedJobs = (jobs ?? []).filter((job) => job.status === "completed");
  const reviewByJob = new Map((reviews ?? []).map((review) => [review.job_id, review]));
  const reviewOpportunities = completedJobs.filter((job) => !reviewByJob.has(job.id));
  const readyReviews = (reviews ?? []).filter((review) => review.status === "ready");
  const websiteProjects = projects ?? [];

  const recommendations: string[] = [];
  if (reviewOpportunities.length) recommendations.push(`${reviewOpportunities.length} completed job${reviewOpportunities.length === 1 ? "" : "s"} still need a review-request draft.`);
  if (readyReviews.length) recommendations.push(`${readyReviews.length} review request${readyReviews.length === 1 ? " is" : "s are"} ready for manual sending; Ziepher will not send them automatically.`);
  if (!profile?.review_url) recommendations.push("Add the business review URL in Setup so review drafts can point customers to the correct profile.");
  if (!websiteProjects.length) recommendations.push("Connect or create the business website so promotions can move through Ziepher’s preview-and-approval workflow.");
  if (bestSource) recommendations.push(`${bestSource.source} is currently the strongest recorded source by ${bestSource.collected > 0 ? "collected revenue" : bestSource.jobs > 0 ? "booked jobs" : "lead volume"}.`);
  if (!recommendations.length) recommendations.push("Growth workflow is caught up. Continue tracking source spend and completed-job reviews before increasing marketing spend.");

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">GROW · TREE SERVICE</div></div></div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Dashboard</Link>
          <Link className="button" href="/operate/attribution">Attribution</Link>
          <Link className="button" href="/projects">Websites</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 22, maxWidth: 1200 }}>
        <div>
          <p className="panel-label">Website & growth</p>
          <h1 style={{ margin: "6px 0 8px" }}>Turn completed work into the next customer.</h1>
          <p className="auth-copy" style={{ maxWidth: 860, margin: 0 }}>Ziepher connects reviews, website promotions, lead-source attribution, and campaign drafts without publishing, messaging, or spending money automatically.</p>
        </div>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Recommended next moves</p>
          <h2 style={{ margin: "6px 0 10px" }}>Based on recorded business data</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {recommendations.map((item) => <div key={item} className="project-card" style={{ minHeight: 0 }}><strong>{item}</strong></div>)}
          </div>
          <p className="auth-copy" style={{ marginBottom: 0 }}>These are deterministic recommendations from your Ziepher records. No paid AI call was used.</p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          <Link className="project-card" href="/operate/attribution" style={{ minHeight: 0 }}><p className="panel-label">Attribution</p><h2>{bestSource?.source ?? "No source leader yet"}</h2><p>{bestSource ? `${bestSource.jobs} jobs · ${money(bestSource.collected)} collected` : "Start capturing lead sources and ad spend."}</p></Link>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Review opportunities</p><h2>{reviewOpportunities.length}</h2><p>Completed jobs without a review-request draft.</p></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Ready review drafts</p><h2>{readyReviews.length}</h2><p>Prepared for manual sending; nothing is sent automatically.</p></div>
          <Link className="project-card" href="/projects" style={{ minHeight: 0 }}><p className="panel-label">Connected websites</p><h2>{websiteProjects.length}</h2><p>Sites available for scans, changes, previews, and campaigns.</p></Link>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Reviews</p>
          <h2 style={{ margin: "6px 0 8px" }}>Completed jobs that can create social proof</h2>
          {reviewOpportunities.length ? <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{reviewOpportunities.slice(0, 12).map((job) => <Link key={job.id} href={`/operate/jobs/${job.id}`} className="project-card" style={{ minHeight: 0 }}><strong>{job.title}</strong><p style={{ marginBottom: 0 }}>Open job → prepare review request</p></Link>)}</div> : <p className="auth-copy">Every completed job currently has a review-request record.</p>}
          {readyReviews.length ? <div style={{ marginTop: 18 }}><strong>Ready for manual sending</strong><div style={{ display: "grid", gap: 8, marginTop: 8 }}>{readyReviews.slice(0, 12).map((review) => <Link key={review.id} href={`/operate/jobs/${review.job_id}`} className="status-pill">Open review draft</Link>)}</div></div> : null}
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Websites & campaigns</p>
          <h2 style={{ margin: "6px 0 8px" }}>Promote what the business needs now</h2>
          <p className="auth-copy" style={{ marginTop: 0 }}>Campaigns start as drafts. A website campaign can become a tracked change request, but AI generation and production publishing remain separate approval-gated actions.</p>
          {websiteProjects.length ? <div className="project-grid" style={{ marginTop: 14 }}>{websiteProjects.map((project) => {
            const domain = project.primary_domain ?? project.source_domain;
            return <article key={project.id} className="project-card"><span className="status-pill">{project.status}</span><h2>{project.business_name ?? project.name}</h2><p>{domain ?? "Domain not connected"}</p><div className="inline-actions"><Link className="button primary" href={`/projects/${project.id}/campaigns`}>Campaign drafts</Link><Link className="button" href={`/projects/${project.id}`}>Website workspace</Link></div></article>;
          })}</div> : <div className="empty-projects"><h2>No website connected yet</h2><p>Create or connect a website to unlock campaign-to-preview workflows.</p><Link className="button primary" href="/projects">Open websites</Link></div>}
        </section>

        <section className="project-card">
          <p className="panel-label">Safety boundary</p>
          <h2>Draft and recommend first.</h2>
          <p>Ziepher does not automatically publish website changes, post to social accounts, launch ads, send review requests, or spend marketing money. Those actions stay behind explicit approval and provider permissions.</p>
        </section>
      </section>
    </main>
  );
}
