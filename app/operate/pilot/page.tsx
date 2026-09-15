import Link from "next/link";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type EvidenceCard = {
  label: string;
  value: number | string;
  detail: string;
  href: string;
};

const manualGates = [
  {
    title: "Authenticated end-to-end pilot run",
    detail: "Run a real signed-in workflow from lead capture through estimate acceptance, job completion, invoice, Stripe test payment, and review/growth follow-up.",
  },
  {
    title: "Two-workspace tenant-isolation test",
    detail: "Use at least two distinct users/workspaces and verify attempted cross-workspace reads and writes are denied across operating records and public/customer links.",
  },
  {
    title: "Stripe test webhook + idempotency exercise",
    detail: "Deliver actual Stripe test-mode events and verify success, staged/partial payment, cancellation, refund, and duplicate/replayed event behavior.",
  },
  {
    title: "Database backup and restore drill",
    detail: "Restore to an approved non-production target and independently validate tenant integrity and critical workflow records.",
  },
  {
    title: "Vercel rollback drill",
    detail: "Verify a known-good release can be restored without bypassing the exact-SHA release controls.",
  },
  {
    title: "Human security review",
    detail: "Review RLS, SECURITY DEFINER functions, secrets, public endpoints, payment/webhook boundaries, and production permissions.",
  },
  {
    title: "Customer-facing legal review",
    detail: "Review privacy, terms, billing/refund language, and other customer-facing legal requirements with an appropriate professional.",
  },
  {
    title: "Controlled Tree Service pilot completion",
    detail: "Complete the workflow with Family Tree Service or another explicitly approved pilot business before broad production-customer launch.",
  },
] as const;

function statusTone(value: number) {
  return value > 0 ? "Evidence present" : "No evidence yet";
}

export default async function TreeServicePilotPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "ensure_personal_workspace",
  );
  if (workspaceError || !workspaceId) {
    throw workspaceError ?? new Error("Workspace unavailable.");
  }

  const [
    { data: profile, error: profileError },
    { count: leadCount, error: leadsError },
    { count: acceptedEstimateCount, error: estimatesError },
    { count: completedJobCount, error: jobsError },
    { count: invoiceCount, error: invoicesError },
    { count: settlementCount, error: settlementsError },
    { count: reviewCount, error: reviewsError },
    { count: completedAutomationCount, error: automationError },
    { count: blockedAutomationCount, error: blockedAutomationError },
  ] = await Promise.all([
    supabase
      .from("workspace_business_profiles")
      .select("business_name,website_url,review_url")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("estimates")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "accepted"),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "completed"),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("payment_transactions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("status", ["succeeded", "partially_refunded", "refunded"]),
    supabase
      .from("operate_review_requests")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("status", ["ready", "sent"]),
    supabase
      .from("operate_automation_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "completed"),
    supabase
      .from("operate_automation_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "blocked"),
  ]);

  for (const error of [
    profileError,
    leadsError,
    estimatesError,
    jobsError,
    invoicesError,
    settlementsError,
    reviewsError,
    automationError,
    blockedAutomationError,
  ]) {
    if (error) throw error;
  }

  const evidence: EvidenceCard[] = [
    {
      label: "Lead records",
      value: leadCount ?? 0,
      detail: "Workspace-scoped lead records currently stored in ZLife.",
      href: "/operate/leads",
    },
    {
      label: "Accepted estimates",
      value: acceptedEstimateCount ?? 0,
      detail: "Accepted estimates provide evidence that the customer-approval path has been exercised in this workspace.",
      href: "/operate/estimates",
    },
    {
      label: "Completed jobs",
      value: completedJobCount ?? 0,
      detail: "Completed field-job records. This does not by itself prove the entire pilot workflow was executed correctly.",
      href: "/operate/calendar",
    },
    {
      label: "Invoice records",
      value: invoiceCount ?? 0,
      detail: "Invoices generated in this workspace, regardless of settlement state.",
      href: "/operate/invoices",
    },
    {
      label: "Recorded settlements",
      value: settlementCount ?? 0,
      detail: "Succeeded/refunded settlement records. This is not proof that the required live-delivered Stripe test webhook exercise has been completed.",
      href: "/operate/invoices",
    },
    {
      label: "Review follow-up evidence",
      value: reviewCount ?? 0,
      detail: "Review requests currently ready or marked sent. No customer message is sent by this dashboard.",
      href: "/operate/growth",
    },
    {
      label: "Completed internal automation",
      value: completedAutomationCount ?? 0,
      detail: "Audited internal automation events completed in the workspace.",
      href: "/operate/assistant",
    },
    {
      label: "Blocked automation events",
      value: blockedAutomationCount ?? 0,
      detail: "Events stopped by worker boundaries or attempt limits and requiring review.",
      href: "/operate/assistant",
    },
  ];

  const businessSetupSignals = [profile?.business_name, profile?.website_url, profile?.review_url].filter(Boolean).length;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">Z-LIFE</div>
            <div className="brand-subtitle">TREE SERVICE · CONTROLLED PILOT</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Business</Link>
          <Link className="button" href="/operate/assistant">Assistant</Link>
          <Link className="button" href="/operate/invoices">Invoices</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24, maxWidth: 1180 }}>
        <div>
          <p className="panel-label">{profile?.business_name ?? "Current workspace"}</p>
          <h1 style={{ margin: "6px 0 10px" }}>Controlled-pilot evidence, without pretending code equals verification.</h1>
          <p className="auth-copy" style={{ maxWidth: 900, margin: 0 }}>
            This screen reads evidence already stored in the signed-in workspace. It does not certify production readiness, execute a pilot, send messages, charge cards, publish anything, or mark manual launch gates complete.
          </p>
        </div>

        <section className="project-grid" style={{ marginTop: 0 }}>
          <article className="project-card">
            <p className="panel-label">Business setup signals</p>
            <h2 style={{ fontSize: 34, margin: "8px 0" }}>{businessSetupSignals}/3</h2>
            <p>Business name, website URL, and review URL currently present.</p>
          </article>
          <article className="project-card">
            <p className="panel-label">Verification status</p>
            <h2>Controlled pilot only</h2>
            <p>Broad production-customer launch remains unapproved until the manual gates below are actually completed.</p>
          </article>
          <article className="project-card">
            <p className="panel-label">Evidence model</p>
            <h2>Observed ≠ verified</h2>
            <p>Database records are useful evidence, but they do not replace deliberate tenant, payment, restore, rollback, security, legal, or pilot testing.</p>
          </article>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <div>
            <p className="panel-label">Workspace evidence</p>
            <h2 style={{ margin: "6px 0 8px" }}>What has actually been recorded</h2>
            <p className="auth-copy" style={{ marginTop: 0 }}>
              These counts are live workspace evidence only. They are intentionally not converted into a launch-ready score.
            </p>
          </div>
          <div className="project-grid" style={{ marginTop: 16 }}>
            {evidence.map((item) => {
              const numeric = typeof item.value === "number" ? item.value : Number(item.value);
              return (
                <Link href={item.href} className="project-card" key={item.label} style={{ minHeight: 0 }}>
                  <div className="project-card-top">
                    <span className="status-pill">{statusTone(Number.isFinite(numeric) ? numeric : 0)}</span>
                  </div>
                  <h3>{item.label}</h3>
                  <strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{item.value}</strong>
                  <p>{item.detail}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <div>
            <p className="panel-label">Manual verification gates</p>
            <h2 style={{ margin: "6px 0 8px" }}>Still required before broad launch</h2>
            <p className="auth-copy" style={{ marginTop: 0 }}>
              ZLife does not mark any of these complete from static code, CI, or record counts. Each requires the named real-world test or professional review.
            </p>
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {manualGates.map((gate, index) => (
              <article className="project-card" key={gate.title} style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "start" }}>
                  <div style={{ flex: "1 1 500px" }}>
                    <strong>{index + 1}. {gate.title}</strong>
                    <p className="auth-copy" style={{ margin: "6px 0 0" }}>{gate.detail}</p>
                  </div>
                  <span className="status-pill">Manual verification required</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="project-card">
          <p className="panel-label">Launch boundary</p>
          <h2>The feature loop can be assembled while launch approval remains blocked.</h2>
          <p>
            CI passing means repository checks passed. Vercel previews being Ready means a candidate rendered. Neither result proves tenant isolation, real Stripe test webhook behavior, restore/rollback readiness, human security review, legal readiness, or successful use by an approved pilot business.
          </p>
        </section>
      </section>
    </main>
  );
}
