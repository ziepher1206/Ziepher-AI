import Link from "next/link";
import { redirect } from "next/navigation";
import { OperateLeadForm } from "@/components/operate-lead-form";
import { OperateLeadInbox } from "@/components/operate-lead-inbox";
import { OperateLeadIntakeSettings } from "@/components/operate-lead-intake-settings";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function OperateLeadsPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const [
    { data: leads, error: leadsError },
    { data: projects, error: projectsError },
    { data: tokens, error: tokensError }
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id,contact_name,email,phone,service_address,message,source,source_detail,status,received_at")
      .eq("workspace_id", workspaceId)
      .order("received_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id,name,primary_domain,source_domain")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("operate_lead_intake_tokens")
      .select("id,token,label,allowed_origin,project_id,expires_at,revoked_at,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
  ]);
  if (leadsError) throw leadsError;
  if (projectsError) throw projectsError;
  if (tokensError) throw tokensError;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER</div>
            <div className="brand-subtitle">LEADS</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Dashboard</Link>
          <Link className="button" href="/operate/attribution">Attribution</Link>
          <Link className="button" href="/projects">Websites</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <div>
          <p className="panel-label">Operate</p>
          <h1 style={{ margin: "6px 0 10px" }}>Lead inbox</h1>
          <p className="auth-copy" style={{ maxWidth: 760, margin: 0 }}>
            Capture requests from phone calls, referrals, website forms, Google, Angi, Facebook, and future Ziepher Match opportunities, then preserve the source through estimate, job, invoice, and collected revenue.
          </p>
        </div>

        <OperateLeadForm workspaceId={workspaceId} />
        <OperateLeadIntakeSettings workspaceId={workspaceId} projects={projects ?? []} tokens={tokens ?? []} />
        <OperateLeadInbox initialLeads={leads ?? []} />
      </section>
    </main>
  );
}
