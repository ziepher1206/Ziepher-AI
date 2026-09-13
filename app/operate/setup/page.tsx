import Link from "next/link";
import { redirect } from "next/navigation";
import { OperateBusinessSetup } from "@/components/operate-business-setup";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function OperateSetupPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const [{ data: services, error: servicesError }, { data: crews, error: crewsError }] = await Promise.all([
    supabase
      .from("services")
      .select("id,name,description,default_duration_minutes,preparation_buffer_minutes,cleanup_buffer_minutes,base_price_cents,active")
      .eq("workspace_id", workspaceId)
      .order("active", { ascending: false })
      .order("name"),
    supabase
      .from("crews")
      .select("id,name,active")
      .eq("workspace_id", workspaceId)
      .order("active", { ascending: false })
      .order("name")
  ]);
  if (servicesError) throw servicesError;
  if (crewsError) throw crewsError;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">BUSINESS SETUP</div></div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Dashboard</Link>
          <Link className="button" href="/operate/calendar">Calendar</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 22, maxWidth: 1100 }}>
        <div>
          <p className="panel-label">Tree Service</p>
          <h1 style={{ margin: "6px 0 8px" }}>Business setup</h1>
          <p className="auth-copy" style={{ maxWidth: 760, margin: 0 }}>Configure the services you sell and the crews you schedule. These records feed estimates, jobs, and the calendar throughout Ziepher.</p>
        </div>
        <OperateBusinessSetup workspaceId={workspaceId} services={services ?? []} crews={crews ?? []} />
      </section>
    </main>
  );
}
