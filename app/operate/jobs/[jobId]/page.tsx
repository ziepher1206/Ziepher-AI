import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ jobId: string }> };

function money(cents: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

export default async function OperateJobPage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const { jobId } = await params;
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id,title,description,status,service_address,estimated_value_cents,planned_start_at,planned_end_at,customers(display_name,phone,email),estimates(id)")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  if (!job) notFound();
  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  const estimate = Array.isArray(job.estimates) ? job.estimates[0] : job.estimates;
  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">JOB</div></div></div>
        <div className="inline-actions"><Link className="button" href="/operate">Dashboard</Link>{estimate?.id ? <Link className="button" href={`/operate/estimates/${estimate.id}`}>Estimate</Link> : null}</div>
      </header>
      <section className="auth-card" style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}><div><p className="panel-label">{customer?.display_name ?? "Customer"}</p><h1 style={{ margin: "6px 0 8px" }}>{job.title}</h1></div><span className="status-pill">{job.status}</span></div>
        <p className="auth-copy">{job.service_address ?? "Service address not added"}</p>
        {job.description ? <p>{job.description}</p> : null}
        <div style={{ marginTop: 20 }}><strong>Estimated value: {money(job.estimated_value_cents)}</strong></div>
        <p className="auth-copy" style={{ marginTop: 14 }}>This job was created from an accepted estimate. Crew assignment and job scheduling are the next workflow step.</p>
      </section>
    </main>
  );
}
