import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function OperateEstimatesPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: estimates, error } = await supabase
    .from("estimates")
    .select("id,title,status,scheduled_at,total_cents,valid_until,created_at,customers(display_name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">ESTIMATES</div></div></div>
        <div className="inline-actions"><Link className="button" href="/operate">Dashboard</Link><Link className="button" href="/operate/leads">Leads</Link></div>
      </header>
      <section style={{ display: "grid", gap: 22 }}>
        <div><p className="panel-label">Operate</p><h1 style={{ margin: "6px 0 10px" }}>Estimates</h1><p className="auth-copy" style={{ margin: 0 }}>Build pricing, review totals, and convert accepted work into jobs.</p></div>
        <section className="project-grid" style={{ marginTop: 0 }}>
          {(estimates ?? []).map((estimate) => {
            const customer = Array.isArray(estimate.customers) ? estimate.customers[0] : estimate.customers;
            return <Link className="project-card" href={`/operate/estimates/${estimate.id}`} key={estimate.id}>
              <div className="project-card-top"><span className="status-pill">{estimate.status}</span><span className="project-version">{money(estimate.total_cents ?? 0)}</span></div>
              <h2>{estimate.title}</h2>
              <p>{customer?.display_name ?? "Customer"}</p>
              <small>{estimate.scheduled_at ? `Scheduled ${new Date(estimate.scheduled_at).toLocaleString()}` : "Not scheduled"}</small>
            </Link>;
          })}
          {!estimates?.length ? <section className="empty-projects"><h2>No estimates yet</h2><p>Schedule an estimate from the lead inbox first.</p></section> : null}
        </section>
      </section>
    </main>
  );
}
