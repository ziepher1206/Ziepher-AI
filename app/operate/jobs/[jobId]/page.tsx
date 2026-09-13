import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

export default async function OperateJobPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const { jobId } = await params;

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id,workspace_id,title,description,status,service_address,estimated_value_cents,planned_start_at,planned_end_at,assigned_crew_id,customers(display_name,phone,email),estimates(id),crews(name)")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  if (!job) notFound();

  const [{ data: crews }, { data: members }] = await Promise.all([
    supabase.from("crews").select("id,name").eq("workspace_id", job.workspace_id).eq("active", true).order("name"),
    supabase.from("workspace_members").select("user_id,role").eq("workspace_id", job.workspace_id).order("created_at")
  ]);

  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
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
        </div>
      </header>

      <section className="auth-card" style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
          <div><p className="panel-label">{customer?.display_name ?? "Customer"}</p><h1 style={{ margin: "6px 0 8px" }}>{job.title}</h1></div>
          <span className="status-pill">{job.status}</span>
        </div>
        <p className="auth-copy">{job.service_address ?? "Service address not added"}</p>
        {job.description ? <p>{job.description}</p> : null}
        <div style={{ marginTop: 20 }}><strong>Estimated value: {money(job.estimated_value_cents)}</strong></div>
        {job.planned_start_at ? (
          <div style={{ marginTop: 14 }}>
            <strong>Scheduled: {dateTime(job.planned_start_at)}</strong>
            <p className="auth-copy" style={{ margin: "5px 0 0" }}>
              {crew?.name ? `Crew: ${crew.name}` : "No crew assigned"}{job.planned_end_at ? ` · Ends ${dateTime(job.planned_end_at)}` : ""}
            </p>
          </div>
        ) : null}
      </section>

      {job.status !== "completed" && job.status !== "canceled" ? (
        <OperateJobScheduler
          jobId={job.id}
          crews={crews ?? []}
          members={members ?? []}
          defaultStartsAt={job.planned_start_at}
          defaultDurationMinutes={job.planned_start_at && job.planned_end_at ? Math.max(15, Math.round((new Date(job.planned_end_at).getTime() - new Date(job.planned_start_at).getTime()) / 60000)) : 180}
        />
      ) : null}
    </main>
  );
}
