import Link from "next/link";

type Priority = {
  label: string;
  detail: string;
  href: string;
  level: "high" | "medium" | "clear";
};

type Props = {
  newLeads: number;
  readyEstimates: number;
  activeJobs: number;
  pausedJobs: number;
  draftInvoices: number;
  overdueInvoices: number;
  outstandingCents: number;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export function OperateDailyPriorities({
  newLeads,
  readyEstimates,
  activeJobs,
  pausedJobs,
  draftInvoices,
  overdueInvoices,
  outstandingCents
}: Props) {
  const priorities: Priority[] = [];

  if (newLeads > 0) priorities.push({
    label: `${newLeads} new lead${newLeads === 1 ? "" : "s"} need attention`,
    detail: "Contact new requests before they go cold and move qualified work toward an estimate.",
    href: "/operate/leads",
    level: "high"
  });

  if (pausedJobs > 0) priorities.push({
    label: `${pausedJobs} paused job${pausedJobs === 1 ? "" : "s"}`,
    detail: "Review paused field work and decide whether to resume, reschedule, or resolve the blocker.",
    href: "/operate/calendar",
    level: "high"
  });

  if (readyEstimates > 0) priorities.push({
    label: `${readyEstimates} estimate${readyEstimates === 1 ? " is" : "s are"} ready for the next step`,
    detail: "Review completed or sent estimates and move accepted work into the job pipeline.",
    href: "/operate/estimates",
    level: "medium"
  });

  if (draftInvoices > 0) priorities.push({
    label: `${draftInvoices} draft invoice${draftInvoices === 1 ? "" : "s"} to review`,
    detail: "Completed jobs have invoices waiting for review before any customer-facing payment step.",
    href: "/operate/invoices",
    level: "medium"
  });

  if (overdueInvoices > 0) priorities.push({
    label: `${overdueInvoices} overdue invoice${overdueInvoices === 1 ? "" : "s"}`,
    detail: `${money(outstandingCents)} is currently outstanding across open invoices.`,
    href: "/operate/invoices",
    level: "high"
  });

  if (priorities.length === 0) priorities.push({
    label: "No urgent operating items detected",
    detail: activeJobs > 0 ? `${activeJobs} active or scheduled job${activeJobs === 1 ? " is" : "s are"} already in the workflow.` : "The current workspace has no urgent leads, paused jobs, draft invoices, or overdue balances.",
    href: "/operate/calendar",
    level: "clear"
  });

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <p className="panel-label">Ziepher Assistant</p>
          <h2 style={{ margin: "6px 0 6px" }}>What needs attention</h2>
          <p className="auth-copy" style={{ margin: 0 }}>Read-only priorities generated from your live business data. No paid AI call is used for this view.</p>
        </div>
        <span className="status-pill">{priorities.filter((priority) => priority.level !== "clear").length} priorities</span>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        {priorities.slice(0, 5).map((priority) => (
          <Link key={`${priority.href}-${priority.label}`} href={priority.href} className="project-card" style={{ minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <strong>{priority.label}</strong>
                <p className="auth-copy" style={{ margin: "6px 0 0" }}>{priority.detail}</p>
              </div>
              <span className="status-pill">{priority.level === "high" ? "High" : priority.level === "medium" ? "Next" : "Clear"}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
