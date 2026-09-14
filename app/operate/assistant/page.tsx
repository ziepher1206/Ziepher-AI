import Link from "next/link";
import { redirect } from "next/navigation";
import { OperateAssistantAI } from "@/components/operate-assistant-ai";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Priority = {
  key: string;
  level: "high" | "next" | "watch" | "clear";
  title: string;
  detail: string;
  href: string;
  action: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export default async function OperateAssistantPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const [
    { data: leads, error: leadsError },
    { data: estimates, error: estimatesError },
    { data: jobs, error: jobsError },
    { data: invoices, error: invoicesError },
    { data: reviews, error: reviewsError },
    { data: campaigns, error: campaignsError },
    { data: profile, error: profileError }
  ] = await Promise.all([
    supabase.from("leads").select("id,contact_name,status,received_at").eq("workspace_id", workspaceId).eq("status", "new").order("received_at", { ascending: true }),
    supabase.from("estimates").select("id,title,status,valid_until,total_cents").eq("workspace_id", workspaceId).in("status", ["completed", "sent"]).order("valid_until", { ascending: true, nullsFirst: false }),
    supabase.from("jobs").select("id,title,status,assigned_crew_id,planned_start_at").eq("workspace_id", workspaceId).in("status", ["scheduled", "en_route", "arrived", "active", "weather_delay", "paused"]).order("planned_start_at", { ascending: true, nullsFirst: false }),
    supabase.from("invoices").select("id,invoice_number,status,balance_due_cents,due_date").eq("workspace_id", workspaceId).in("status", ["draft", "sent", "partial", "overdue"]).order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("operate_review_requests").select("id,job_id,status").eq("workspace_id", workspaceId),
    supabase.from("marketing_campaigns").select("id,project_id,name,status,ends_at").eq("workspace_id", workspaceId).order("ends_at", { ascending: true, nullsFirst: false }),
    supabase.from("workspace_business_profiles").select("business_name,review_url,website_url").eq("workspace_id", workspaceId).maybeSingle()
  ]);
  if (leadsError) throw leadsError;
  if (estimatesError) throw estimatesError;
  if (jobsError) throw jobsError;
  if (invoicesError) throw invoicesError;
  if (reviewsError) throw reviewsError;
  if (campaignsError) throw campaignsError;
  if (profileError) throw profileError;

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  const priorities: Priority[] = [];
  const newLeads = leads ?? [];
  if (newLeads.length) priorities.push({
    key: "new-leads",
    level: "high",
    title: `${newLeads.length} new lead${newLeads.length === 1 ? " needs" : "s need"} contact`,
    detail: newLeads.length === 1 ? `${newLeads[0].contact_name} is waiting for first contact.` : `Oldest first: ${newLeads.slice(0, 3).map((lead) => lead.contact_name).join(", ")}.`,
    href: "/operate/leads",
    action: "Work lead inbox"
  });

  const expiring = (estimates ?? []).filter((estimate) => estimate.valid_until && new Date(`${estimate.valid_until}T23:59:59`) <= tomorrow && new Date(`${estimate.valid_until}T23:59:59`) >= now);
  if (expiring.length) priorities.push({
    key: "expiring-estimates",
    level: "high",
    title: `${expiring.length} estimate${expiring.length === 1 ? " expires" : "s expire"} by tomorrow`,
    detail: expiring.slice(0, 3).map((estimate) => `${estimate.title} (${shortDate(estimate.valid_until!)})`).join(" · "),
    href: "/operate/estimates",
    action: "Review expiring estimates"
  });

  const unassignedJobs = (jobs ?? []).filter((job) => job.status === "scheduled" && !job.assigned_crew_id);
  if (unassignedJobs.length) priorities.push({
    key: "unassigned-jobs",
    level: "high",
    title: `${unassignedJobs.length} scheduled job${unassignedJobs.length === 1 ? " needs" : "s need"} a crew`,
    detail: unassignedJobs.slice(0, 3).map((job) => job.title).join(" · "),
    href: "/operate/calendar",
    action: "Assign crew"
  });

  const delayedJobs = (jobs ?? []).filter((job) => job.status === "weather_delay" || job.status === "paused");
  if (delayedJobs.length) priorities.push({
    key: "delayed-jobs",
    level: "high",
    title: `${delayedJobs.length} job${delayedJobs.length === 1 ? " is" : "s are"} paused or weather-delayed`,
    detail: delayedJobs.slice(0, 3).map((job) => job.title).join(" · "),
    href: "/operate/calendar",
    action: "Resolve field blockers"
  });

  const overdue = (invoices ?? []).filter((invoice) => invoice.status === "overdue");
  const overdueCents = overdue.reduce((sum, invoice) => sum + (invoice.balance_due_cents ?? 0), 0);
  if (overdue.length) priorities.push({
    key: "overdue-invoices",
    level: "high",
    title: `${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"}`,
    detail: `${money(overdueCents)} remains outstanding. No payment reminder will be sent automatically.`,
    href: "/operate/invoices",
    action: "Review overdue invoices"
  });

  const drafts = (invoices ?? []).filter((invoice) => invoice.status === "draft");
  if (drafts.length) priorities.push({
    key: "draft-invoices",
    level: "next",
    title: `${drafts.length} draft invoice${drafts.length === 1 ? "" : "s"} need review`,
    detail: "Check completed-work totals and payment terms before any customer-facing payment step.",
    href: "/operate/invoices",
    action: "Review draft invoices"
  });

  const readyReviewJobs = new Set((reviews ?? []).filter((review) => review.status === "ready").map((review) => review.job_id));
  if (readyReviewJobs.size) priorities.push({
    key: "ready-reviews",
    level: "next",
    title: `${readyReviewJobs.size} review request${readyReviewJobs.size === 1 ? " is" : "s are"} ready`,
    detail: "The wording is prepared for manual sending. Ziepher will not contact customers automatically.",
    href: "/operate/growth",
    action: "Review follow-up drafts"
  });

  const endingCampaigns = (campaigns ?? []).filter((campaign) => campaign.ends_at && new Date(campaign.ends_at) >= now && new Date(campaign.ends_at) <= nextWeek && campaign.status !== "published");
  if (endingCampaigns.length) priorities.push({
    key: "ending-campaigns",
    level: "watch",
    title: `${endingCampaigns.length} campaign${endingCampaigns.length === 1 ? " ends" : "s end"} within 7 days`,
    detail: endingCampaigns.slice(0, 3).map((campaign) => campaign.name).join(" · "),
    href: endingCampaigns[0]?.project_id ? `/projects/${endingCampaigns[0].project_id}/campaigns` : "/operate/growth",
    action: "Review campaign timing"
  });

  if (!profile?.review_url) priorities.push({
    key: "review-url",
    level: "watch",
    title: "Business review URL is missing",
    detail: "Add the correct review destination before using prepared review-request drafts.",
    href: "/operate/setup",
    action: "Complete business setup"
  });

  if (!priorities.length) priorities.push({
    key: "clear",
    level: "clear",
    title: "No urgent next action detected",
    detail: "Current leads, estimates, jobs, invoices, reviews, and campaigns have no launch-rule exception that needs immediate attention.",
    href: "/operate",
    action: "Return to dashboard"
  });

  const rank = { high: 0, next: 1, watch: 2, clear: 3 } as const;
  priorities.sort((a, b) => rank[a.level] - rank[b.level]);
  const urgentCount = priorities.filter((item) => item.level === "high").length;
  const assistantPriorities = priorities.map(({ level, title, detail, action }) => ({
    level,
    title,
    detail,
    action
  }));
  const budgetUsd = Number(process.env.ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD ?? "0");
  const liveAIAvailable =
    process.env.ZLIFE_ASSISTANT_PAID_AI_ENABLED === "true" &&
    Boolean(process.env.OPENAI_API_KEY?.trim()) &&
    Boolean(process.env.OPENAI_PLANNING_MODEL?.trim()) &&
    Boolean(process.env.OPENAI_PLANNING_MAX_OUTPUT_TOKENS?.trim()) &&
    Number.isFinite(budgetUsd) &&
    budgetUsd > 0;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">ASSISTANT · TREE SERVICE</div></div></div>
        <div className="inline-actions"><Link className="button" href="/operate">Dashboard</Link><Link className="button" href="/operate/growth">Growth</Link><Link className="button" href="/operate/calendar">Calendar</Link></div>
      </header>

      <section style={{ display: "grid", gap: 22, maxWidth: 1120 }}>
        <div>
          <p className="panel-label">{profile?.business_name ?? "Your business"}</p>
          <h1 style={{ margin: "6px 0 8px" }}>Here’s what I would work on next.</h1>
          <p className="auth-copy" style={{ maxWidth: 820, margin: 0 }}>One prioritized view across Tree Service operations and growth. The core queue remains read-only and deterministic, so it costs no AI tokens and cannot take a risky action behind your back.</p>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Urgent</p><h2 style={{ fontSize: 34, margin: "8px 0" }}>{urgentCount}</h2><p>Items that should be handled first.</p></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">New leads</p><h2 style={{ fontSize: 34, margin: "8px 0" }}>{newLeads.length}</h2><p>Waiting for first contact.</p></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Active field work</p><h2 style={{ fontSize: 34, margin: "8px 0" }}>{(jobs ?? []).length}</h2><p>Scheduled through paused/weather delay.</p></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Outstanding overdue</p><h2 style={{ fontSize: 34, margin: "8px 0" }}>{money(overdueCents)}</h2><p>No automatic collection action.</p></div>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
            <div><p className="panel-label">Prioritized queue</p><h2 style={{ margin: "6px 0 8px" }}>Prepared next actions</h2></div>
            <span className="status-pill">Zero-cost advisor mode</span>
          </div>
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {priorities.map((priority) => (
              <Link key={priority.key} href={priority.href} className="project-card" style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 360px" }}><strong>{priority.title}</strong><p className="auth-copy" style={{ margin: "6px 0 0" }}>{priority.detail}</p></div>
                  <div style={{ textAlign: "right" }}><span className="status-pill">{priority.level === "high" ? "High" : priority.level === "next" ? "Next" : priority.level === "watch" ? "Watch" : "Clear"}</span><div style={{ marginTop: 8 }}><strong>{priority.action} →</strong></div></div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <OperateAssistantAI
          businessName={profile?.business_name ?? "Your business"}
          priorities={assistantPriorities}
          liveAIAvailable={liveAIAvailable}
        />

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">What I checked</p>
          <h2 style={{ margin: "6px 0 8px" }}>Operations + growth context</h2>
          <div className="project-grid" style={{ marginTop: 14 }}>
            <Link className="project-card" href="/operate/leads"><strong>Leads</strong><p>New requests and first-contact urgency.</p></Link>
            <Link className="project-card" href="/operate/estimates"><strong>Estimates</strong><p>Customer-facing estimates approaching expiration.</p></Link>
            <Link className="project-card" href="/operate/calendar"><strong>Jobs & crews</strong><p>Unassigned work, pauses, and weather delays.</p></Link>
            <Link className="project-card" href="/operate/invoices"><strong>Invoices</strong><p>Drafts, overdue balances, and payment follow-up needs.</p></Link>
            <Link className="project-card" href="/operate/growth"><strong>Growth</strong><p>Review drafts, campaign timing, and business setup gaps.</p></Link>
          </div>
        </section>

        <section className="project-card">
          <p className="panel-label">Approval boundary</p>
          <h2>I can prepare the next move without executing the risky part.</h2>
          <p>Customer messages, social publishing, paid ads, production website releases, live Stripe charges, provider upgrades, and destructive actions remain outside this assistant and require explicit approval before execution.</p>
        </section>
      </section>
    </main>
  );
}
