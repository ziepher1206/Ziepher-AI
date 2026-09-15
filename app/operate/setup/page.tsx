import Link from "next/link";
import { redirect } from "next/navigation";
import { selectBusinessIndustryAction } from "@/app/operate/setup/industry-actions";
import { OperateBusinessProfile } from "@/components/operate-business-profile";
import { OperateBusinessSetup } from "@/components/operate-business-setup";
import { OperateScheduleExceptions } from "@/components/operate-schedule-exceptions";
import { OperateServiceSelector } from "@/components/operate-service-selector";
import { OperateTimezoneSetup } from "@/components/operate-timezone-setup";
import { ZLifeHeartbeat } from "@/components/zlife-heartbeat";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function isMissingIndustrySchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "")
    || error.message?.includes("zlife_service_industries") === true
    || error.message?.includes("industry_key") === true;
}

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
    supabase.from("workspace_business_profiles").select("business_name,phone,email,website_url,review_url,service_area,about,owner_name,years_in_business,emergency_service,insurance_status,license_insurance_notes").eq("workspace_id", workspaceId).maybeSingle(),
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

  const [industryCatalogResult, industryProfileResult] = await Promise.all([
    supabase
      .from("zlife_service_industries")
      .select("industry_key,name,description,status")
      .in("status", ["available", "preview"])
      .order("name"),
    supabase
      .from("workspace_business_profiles")
      .select("industry_key")
      .eq("workspace_id", workspaceId)
      .maybeSingle()
  ]);

  const industrySchemaMissing = isMissingIndustrySchema(industryCatalogResult.error)
    || isMissingIndustrySchema(industryProfileResult.error);
  if (industryCatalogResult.error && !isMissingIndustrySchema(industryCatalogResult.error)) throw industryCatalogResult.error;
  if (industryProfileResult.error && !isMissingIndustrySchema(industryProfileResult.error)) throw industryProfileResult.error;

  const currentIndustryKey = industryProfileResult.data?.industry_key ?? null;
  const industries = industryCatalogResult.data ?? [];

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112" }}>Z</div>
          <div>
            <div className="brand-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><span>Z</span><ZLifeHeartbeat width={32} height={12} /><span>LIFE</span></div>
            <div className="brand-subtitle">SERVICE BUSINESS OS</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/operate">Business home</Link>
          <Link className="button" href="/dashboard">My Z-Life</Link>
          <Link className="button" href="/operate/calendar">Calendar</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 22, maxWidth: 1180 }}>
        <div>
          <p className="panel-label">One business engine · industry-aware setup</p>
          <h1 style={{ margin: "6px 0 8px" }}>Set up your service business.</h1>
          <p className="auth-copy" style={{ maxWidth: 840, margin: 0 }}>Z-Life Business uses one shared operating system for service companies. Your industry profile changes the terminology, fields, recommendations, pricing context, and workflows layered on top without turning every trade into a separate app.</p>
        </div>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Industry profile</p>
          <h2 style={{ margin: "6px 0 8px" }}>What kind of service business do you run?</h2>
          <p className="auth-copy" style={{ marginTop: 0 }}>Tree Service is the first fully active profile. Other trades are visible as previews while their trade-specific workflows are being completed and tested.</p>

          {industrySchemaMissing ? (
            <div className="project-card" style={{ minHeight: 0, marginTop: 16 }}>
              <span className="status-pill">Database update pending</span>
              <h3>Industry profiles are built in code.</h3>
              <p>The database migration <code>20260915140500_unified_service_business_os.sql</code> must be applied before this workspace can save an industry choice. Z-Life will not pretend the selection is active before that migration exists in the connected environment.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12, marginTop: 16 }}>
              {industries.map((industry) => {
                const isCurrent = currentIndustryKey === industry.industry_key;
                const isAvailable = industry.status === "available";
                return (
                  <article className="project-card" key={industry.industry_key} style={{ minHeight: 0, borderColor: isCurrent ? "rgba(127,255,212,.55)" : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                      <span className="status-pill">{isAvailable ? "Active profile" : "Preview"}</span>
                      {isCurrent ? <strong style={{ color: "#7fffd4", fontSize: 11 }}>SELECTED</strong> : null}
                    </div>
                    <h3 style={{ margin: "18px 0 7px" }}>{industry.name}</h3>
                    <p>{industry.description}</p>
                    {isAvailable ? (
                      <form action={selectBusinessIndustryAction} style={{ marginTop: 14 }}>
                        <input type="hidden" name="industryKey" value={industry.industry_key} />
                        <button className={isCurrent ? "button" : "button primary"} disabled={isCurrent} type="submit">{isCurrent ? "Current profile" : `Use ${industry.name}`}</button>
                      </form>
                    ) : <p className="auth-copy" style={{ margin: "14px 0 0", fontSize: 12 }}>Shared business features can be built now; trade-specific workflow activation comes after validation.</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <OperateBusinessProfile workspaceId={workspaceId} profile={businessProfile ?? null} />
        <OperateServiceSelector workspaceId={workspaceId} services={(services ?? []).map(({ id, name, active }) => ({ id, name, active }))} />
        <OperateTimezoneSetup workspaceId={workspaceId} timezone={workspace?.timezone ?? null} />
        <div className="hide-legacy-service-setup">
          <OperateBusinessSetup workspaceId={workspaceId} services={services ?? []} crews={crews ?? []} workspaceMembers={workspaceMembers ?? []} crewMembers={crewMembers ?? []} availabilityRules={availabilityRules ?? []} />
        </div>
        <OperateScheduleExceptions workspaceId={workspaceId} timezone={workspace?.timezone ?? null} crews={crews ?? []} overrides={(scheduleOverrides ?? []) as never[]} />
      </section>
      <style>{`.hide-legacy-service-setup > div > section:first-child { display: none; }`}</style>
    </main>
  );
}
