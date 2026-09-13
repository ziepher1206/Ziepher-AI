import Link from "next/link";
import { redirect } from "next/navigation";
import { OperateLeadForm } from "@/components/operate-lead-form";
import { OperateLeadInbox } from "@/components/operate-lead-inbox";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function OperateLeadsPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id,contact_name,email,phone,service_address,message,source,status,received_at")
    .eq("workspace_id", workspaceId)
    .order("received_at", { ascending: false });
  if (error) throw error;

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
            Capture requests from phone calls, referrals, website forms, and future Ziepher Match opportunities, then move each lead through the sales process.
          </p>
        </div>

        <OperateLeadForm workspaceId={workspaceId} />
        <OperateLeadInbox initialLeads={leads ?? []} />
      </section>
    </main>
  );
}
