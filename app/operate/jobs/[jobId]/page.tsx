/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OperateFieldReadiness } from "@/components/operate-field-readiness";
import { OperateJobChangeOrders } from "@/components/operate-job-change-orders";
import { OperateJobExecution } from "@/components/operate-job-execution";
import { OperateJobPhotoUpload } from "@/components/operate-job-photo-upload";
import { OperateJobScheduler } from "@/components/operate-job-scheduler";
import { OperateReviewRequestDraft } from "@/components/operate-review-request-draft";
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
    .select("id,workspace_id,property_id,title,description,status,service_address,estimated_value_cents,final_value_cents,planned_start_at,planned_end_at,actual_start_at,actual_end_at,assigned_crew_id,required_equipment,power_line_hazard,traffic_control_required,structure_risk,weather_sensitive,completion_work_verified,completion_cleanup_verified,completion_notes,customers(display_name,phone,email,notes),properties(id,label,address_line_1,address_line_2,city,region,postal_code,access_notes,hazard_notes,tree_notes),estimates(id),crews(name)")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  if (!job) notFound();

  const estimate = Array.isArray(job.estimates) ? job.estimates[0] : job.estimates;

  const [
    { data: crews },
    { data: members },
    { data: invoice },
    { data: media, error: mediaError },
    { data: estimateMedia, error: estimateMediaError },
    { data: reviewDraft, error: reviewDraftError },
    { data: changeOrders, error: changeOrdersError }
  ] = await Promise.all([
    supabase.from("crews").select("id,name").eq("workspace_id", job.workspace_id).eq("active", true).order("name"),
    supabase.from("workspace_members").select("user_id,role").eq("workspace_id", job.workspace_id).order("created_at"),
    supabase.from("invoices").select("id").eq("workspace_id", job.workspace_id).eq("job_id", job.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("operate_job_media").select("id,category,storage_bucket,storage_path,display_name,caption,created_at").eq("workspace_id", job.workspace_id).eq("job_id", job.id).order("created_at", { ascending: false }).limit(100),
    estimate?.id
      ? supabase.from("operate_estimate_media").select("id,category,storage_bucket,storage_path,display_name,caption,created_at").eq("workspace_id", job.workspace_id).eq("estimate_id", estimate.id).order("created_at", { ascending: true }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("operate_review_requests").select("id,status,subject,message,review_url").eq("workspace_id", job.workspace_id).eq("job_id", job.id).maybeSingle(),
    supabase.from("operate_job_change_orders").select("id,description,amount_cents,status,approval_method,approved_at,created_at").eq("workspace_id", job.workspace_id).eq("job_id", job.id).order("created_at", { ascending: true })
  ]);
  if (mediaError) throw mediaError;
  if (estimateMediaError) throw estimateMediaError;
  if (reviewDraftError) throw reviewDraftError;
  if (changeOrdersError) throw changeOrdersError;

  const [photoItems, estimatePhotoItems] = await Promise.all([
    Promise.all((media ?? []).map(async (item) => {
      const { data } = await supabase.storage.from(item.storage_bucket).createSignedUrl(item.storage_path, 60 * 30);
      return { ...item, signedUrl: data?.signedUrl ?? null };
    })),
    Promise.all((estimateMedia ?? []).map(async (item) => {
      const { data } = await supabase.storage.from(item.storage_bucket).createSignedUrl(item.storage_path, 60 * 30);
      return { ...item, signedUrl: data?.signedUrl ?? null };
    }))
  ]);

  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
  const crew = Array.isArray(job.crews) ? job.crews[0] : job.crews;
  const address = job.service_address ?? [property?.address_line_1, property?.city, property?.region, property?.postal_code].filter(Boolean).join(", ");
  const navigationUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const afterPhotoCount = (media ?? []).filter((item) => item.category === "after").length;
  const approvedChangeOrderCents = (changeOrders ?? []).filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount_cents, 0);
  const completionReady = Boolean(job.completion_work_verified && job.completion_cleanup_verified);
  const closed = ["completed", "canceled"].includes(job.status);

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">FIELD JOB</div></div></div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Dashboard</Link>
          <Link className="button" href="/operate/calendar">Calendar</Link>
          {estimate?.id ? <Link className="button" href={`/operate/estimates/${estimate.id}`}>Estimate</Link> : null}
          {invoice?.id ? <Link className="button" href={`/operate/invoices/${invoice.id}`}>Invoice</Link> : null}
        </div>
      </header>

      <section className="auth-card" style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
          <div><p className="panel-label">{customer?.display_name ?? "Customer"}</p><h1 style={{ margin: "6px 0 8px" }}>{job.title}</h1></div>
          <span className="status-pill">{job.status.replaceAll("_", " ")}</span>
        </div>
        <p className="auth-copy">{address || "Service address not added"}</p>
        <div className="inline-actions" style={{ marginTop: 10 }}>
          {navigationUrl ? <a className="button primary" href={navigationUrl} target="_blank" rel="noreferrer">Navigate</a> : null}
          {customer?.phone ? <a className="button" href={`tel:${customer.phone}`}>Call customer</a> : null}
          {customer?.email ? <a className="button" href={`mailto:${customer.email}`}>Email customer</a> : null}
        </div>
        {customer?.notes ? <p className="auth-copy" style={{ marginTop: 14 }}><strong>Customer note:</strong> {customer.notes}</p> : null}
        <div style={{ marginTop: 20 }}><strong>{job.status === "completed" ? "Final value" : "Estimated value"}: {money(job.status === "completed" ? job.final_value_cents : job.estimated_value_cents)}</strong>{approvedChangeOrderCents > 0 ? <span className="auth-copy"> · Approved extras {money(approvedChangeOrderCents)}</span> : null}</div>
        {job.planned_start_at ? (
          <div style={{ marginTop: 14 }}>
            <strong>Scheduled: {dateTime(job.planned_start_at)}</strong>
            <p className="auth-copy" style={{ margin: "5px 0 0" }}>{crew?.name ? `Crew: ${crew.name}` : "No crew assigned"}{job.planned_end_at ? ` · Ends ${dateTime(job.planned_end_at)}` : ""}</p>
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
        requiredEquipment={job.required_equipment ?? []}
        powerLineHazard={job.power_line_hazard}
        trafficControlRequired={job.traffic_control_required}
        structureRisk={job.structure_risk}
        weatherSensitive={job.weather_sensitive}
        completionWorkVerified={job.completion_work_verified}
        completionCleanupVerified={job.completion_cleanup_verified}
        completionNotes={job.completion_notes ?? ""}
      />

      {estimatePhotoItems.length ? (
        <section className="auth-card" style={{ maxWidth: 900 }}>
          <p className="panel-label">Estimate handoff</p>
          <h2 style={{ margin: "6px 0 8px" }}>Estimator field photos</h2>
          <p className="auth-copy" style={{ marginTop: 0 }}>Photos captured during the estimate stay attached to the field job so the crew can review scope, access, and hazards before work starts.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 16 }}>
            {estimatePhotoItems.map((photo) => (
              <article key={photo.id} className="project-card" style={{ minHeight: 0 }}>
                {photo.signedUrl ? <img src={photo.signedUrl} alt={photo.caption || photo.display_name} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10 }} /> : null}
                <div style={{ marginTop: 10 }}><span className="status-pill">{photo.category}</span></div>
                <strong style={{ display: "block", marginTop: 8 }}>{photo.caption || photo.display_name}</strong>
                <small className="auth-copy">Captured {dateTime(photo.created_at)}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <OperateJobPhotoUpload workspaceId={job.workspace_id} jobId={job.id} propertyId={job.property_id} />

      <section className="auth-card" style={{ maxWidth: 900 }}>
        <p className="panel-label">Private job gallery</p>
        <h2 style={{ margin: "6px 0 8px" }}>Before / after photos</h2>
        {photoItems.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 16 }}>
            {photoItems.map((photo) => (
              <article key={photo.id} className="project-card" style={{ minHeight: 0 }}>
                {photo.signedUrl ? <img src={photo.signedUrl} alt={photo.caption || photo.display_name} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10 }} /> : null}
                <div style={{ marginTop: 10 }}><span className="status-pill">{photo.category}</span></div>
                <strong style={{ display: "block", marginTop: 8 }}>{photo.caption || photo.display_name}</strong>
                <small className="auth-copy">{dateTime(photo.created_at)}</small>
              </article>
            ))}
          </div>
        ) : <p className="auth-copy">No job photos yet.</p>}
      </section>

      <OperateJobChangeOrders jobId={job.id} initialOrders={changeOrders ?? []} closed={closed} />

      {!closed ? (
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
        approvedChangeOrderCents={approvedChangeOrderCents}
        completionReady={completionReady}
        afterPhotoCount={afterPhotoCount}
        invoiceId={invoice?.id ?? null}
      />

      <OperateReviewRequestDraft jobId={job.id} completed={job.status === "completed"} initialDraft={reviewDraft ?? null} />
    </main>
  );
}