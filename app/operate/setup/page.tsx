import Link from "next/link";
import { redirect } from "next/navigation";
import { OperateBusinessProfile } from "@/components/operate-business-profile";
import { OperateBusinessSetup } from "@/components/operate-business-setup";
import { OperateScheduleExceptions } from "@/components/operate-schedule-exceptions";
import { OperateServiceTiming } from "@/components/operate-service-timing";
import { OperateTimezoneSetup } from "@/components/operate-timezone-setup";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function OperateSetupPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const [
    { data: workspace, error: workspaceDetailsError },
    { data: businessProfile, error: businessProfileError },
    { data: services, error: servicesError },
    { data: crews, error: crewsError },
    { data: workspaceMembers, error: membersError },
    { data: crewMembers, error: crewMembersError },
    { data: availabilityRules, error: availabilityError },
    { data: scheduleOverrides, error: overridesError }
  ] = await Promise.all([
    supabase.from("workspaces").select("id,timezone").eq("id", workspaceId).single(),
    supabase.from("workspace_business_profiles").select("business_name,phone,email,website_url,review_url,service_area,about,owner_name,years_in_business,emergency_service,license_insurance_notes").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("services").select("id,name,description,default_duration_minutes,travel_buffer_minutes,preparation_buffer_minutes,cleanup_buffer_minutes,base_price_cents,active").eq("workspace_id", workspaceId).order("active", { ascending: false }).order("name"),
    supabase.from("crews").select("id,name,active").eq("workspace_id", workspaceId).order("active", { ascending: false }).order("name"),
    supabase.from("workspace_members").select("user_id,role").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("crew_members").select("id,crew_id,user_id,is_lead").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("availability_rules").select("id,resource_crew_id,day_of_week,starts_at_local,ends_at_local,active").eq("workspace_id", workspaceId).eq("resource_type", "crew").order("day_of_week"),
    supabase.from("schedule_overrides").select("id,resource_type,resource_crew_id,mode,starts_at,ends_at,note").eq("workspace_id", workspaceId).gte("ends_at", new Date().toISOString()).order("starts_at")
  ]);
  if (workspaceDetailsError) throw workspaceDetailsError;
  if (businessProfileError) throw businessProfileError;
  if (servicesError) throw servicesError;
  if (crewsError) throw crewsError;
  if (membersError) throw membersError;
  if (crewMembersError) throw crewMembersError;
  if (availabilityError) throw availabilityError;
  if (overridesError) throw overridesError;

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
          <p className="auth-copy" style={{ maxWidth: 760, margin: 0 }}>Configure company details, service area, services, crews, staffing, timezone, working hours, and temporary schedule exceptions. Ziepher can reuse this verified business context across operations and future modules.</p>
        </div>
        <OperateBusinessProfile workspaceId={workspaceId} profile={businessProfile ?? null} />
        <OperateTimezoneSetup workspaceId={workspaceId} timezone={workspace?.timezone ?? null} />
        <OperateBusinessSetup workspaceId={workspaceId} services={services ?? []} crews={crews ?? []} workspaceMembers={workspaceMembers ?? []} crewMembers={crewMembers ?? []} availabilityRules={availabilityRules ?? []} />
        <OperateServiceTiming workspaceId={workspaceId} services={services ?? []} />
        <OperateScheduleExceptions workspaceId={workspaceId} timezone={workspace?.timezone ?? null} crews={crews ?? []} overrides={(scheduleOverrides ?? []) as never[]} />
      </section>
    </main>
  );
}
