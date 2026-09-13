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
    { data: workspace, error: workspaceDetailsError },
    { data: membership, error: membershipError },
    { data: leads, error: leadsError },
    { data: projects, error: projectsError }
  ] = await Promise.all([
    supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single(),
    supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("leads")
      .select("id,contact_name,email,phone,service_address,message,source,source_detail,status,received_at")
      .eq("workspace_id", workspaceId)
      .order("received_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id,name,primary_domain,source_domain")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
  ]);
  if (workspaceDetailsError) throw workspaceDetailsError;
  if (membershipError) throw membershipError;
  if (leadsError) throw leadsError;
  if (projectsError) throw projectsError;

  const canManageIntake = workspace.owner_id === user.id || ["owner", "admin"].includes(membership?.role ?? "");
  let tokens: Array<{
    id: string;
    token: string;
    label: string;
    allowed_origin: string | null;
    project_id: string | null;
    expires_at: string | null;
    revoked_at: string | null;
    created_at: string;
  }> = [];

  if (canManageIntake) {
    const { data, error } = await supabase
      .from("operate_lead_intake_tokens")
      .select("id,token,label,allowed_origin,project_id,expires_at,revoked_at,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    tokens = data ?? [];
  }

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
        {canManageIntake ? <OperateLeadIntakeSettings workspaceId={workspaceId} projects={projects ?? []} tokens={tokens} /> : null}
        <OperateLeadInbox initialLeads={leads ?? []} />
      </section>
    </main>
  );
}
