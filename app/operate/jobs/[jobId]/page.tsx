import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OperateFieldReadiness } from "@/components/operate-field-readiness";
import { OperateJobExecution } from "@/components/operate-job-execution";
import { OperateJobScheduler } from "@/components/operate-job-scheduler";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ jobId: string }> };

function money(cents: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function dateTime(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function treeSummary(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const summary = (value as Record<string, unknown>).summary;
  return typeof summary === "string" ? summary : "";
}

export default async function OperateJobPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const { jobId } = await params;

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id,workspace_id,property_id,title,description,status,service_address,estimated_value_cents,final_value_cents,planned_start_at,planned_end_at,actual_start_at,actual_end_at,assigned_crew_id,customers(display_name,phone,email,notes),properties(id,label,address_line_1,address_line_2,city,region,postal_code,access_notes,hazard_notes,tree_notes),estimates(id),crews(name)")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  if (!job) notFound();

  const [{ data: crews }, { data: members }, { data: invoice }] = await Promise.all([
    supabase.from("crews").select("id,name").eq("workspace_id", job.workspace_id).eq("active", true).order("name"),
    supabase.from("workspace_members").select("user_id,role").eq("workspace_id", job.workspace_id).order("created_at"),
    supabase.from("invoices").select("id").eq("workspace_id", job.workspace_id).eq("job_id", job.id).order("created_at", { ascending: true }).limit(1).maybeSingle()
  ]);

  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
  const estimate = Array.isArray(job.estimates) ? job.estimates[0] : job.estimates;
  const crew = Array.isArray(job.crews) ? job.crews[0] : job.crews;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">JOB</div></div></div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Dashboard</Link>
          <Link className="button" href="/operate/calendar">Calendar</Link>
          {estimate?.id ? <Link className="button" href={`/operate/estimates/${estimate.id}`}>Estimate</Link> : null}
          {invoice?.id ? <Link className="button" href={`/operate/invoices/${invoice.id}`}>Invoice</Link> : null}
        </div>
      </header>

      <section className="auth-card" style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
          <div><p className="panel-label">{customer?.display_name ?? "Customer"}</p><h1 style={{ margin: "6px 0 8px" }}>{job.title}</h1></div>
          <span className="status-pill">{job.status}</span>
        </div>
        <p className="auth-copy">{job.service_address ?? property?.address_line_1 ?? "Service address not added"}</p>
        <div className="inline-actions" style={{ marginTop: 10 }}>
          {customer?.phone ? <a className="button" href={`tel:${customer.phone}`}>Call customer</a> : null}
          {customer?.email ? <a className="button" href={`mailto:${customer.email}`}>Email customer</a> : null}
        </div>
        {customer?.notes ? <p className="auth-copy" style={{ marginTop: 14 }}><strong>Customer note:</strong> {customer.notes}</p> : null}
        <div style={{ marginTop: 20 }}><strong>{job.status === "completed" ? "Final value" : "Estimated value"}: {money(job.status === "completed" ? job.final_value_cents : job.estimated_value_cents)}</strong></div>
        {job.planned_start_at ? (
          <div style={{ marginTop: 14 }}>
            <strong>Scheduled: {dateTime(job.planned_start_at)}</strong>
            <p className="auth-copy" style={{ margin: "5px 0 0" }}>
              {crew?.name ? `Crew: ${crew.name}` : "No crew assigned"}{job.planned_end_at ? ` · Ends ${dateTime(job.planned_end_at)}` : ""}
            </p>
          </div>
        ) : null}
        {job.actual_start_at ? <p className="auth-copy" style={{ marginBottom: 0 }}>Started {dateTime(job.actual_start_at)}{job.actual_end_at ? ` · Completed ${dateTime(job.actual_end_at)}` : ""}</p> : null}
      </section>

      <OperateFieldReadiness
        jobId={job.id}
        hasProperty={Boolean(property?.id)}
        accessNotes={property?.access_notes ?? ""}
        hazardNotes={property?.hazard_notes ?? ""}
        treeNotes={treeSummary(property?.tree_notes)}
        jobNotes={job.description ?? ""}
      />

      {job.status !== "completed" && job.status !== "canceled" ? (
        <OperateJobScheduler
          jobId={job.id}
          crews={crews ?? []}
          members={members ?? []}
          defaultStartsAt={job.planned_start_at}
          defaultDurationMinutes={job.planned_start_at && job.planned_end_at ? Math.max(15, Math.round((new Date(job.planned_end_at).getTime() - new Date(job.planned_start_at).getTime()) / 60000)) : 180}
        />
      ) : null}

      <OperateJobExecution
        jobId={job.id}
        status={job.status}
        estimatedValueCents={job.estimated_value_cents}
        finalValueCents={job.final_value_cents}
        invoiceId={invoice?.id ?? null}
      />
    </main>
  );
}
