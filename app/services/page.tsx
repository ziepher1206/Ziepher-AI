import Link from "next/link";
import { redirect } from "next/navigation";

import {
  addServiceRequestAction,
  cancelServiceRequestAction,
} from "@/app/services/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function missingServicesSchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("Could not find the table") === true
  );
}

function ServicesHeader() {
  return (
    <header className="projects-header">
      <div className="brand">
        <div className="brand-mark">Z</div>
        <div>
          <div className="brand-title">Z-LIFE</div>
          <div className="brand-subtitle">SERVICES</div>
        </div>
      </div>
      <div className="inline-actions">
        <Link className="button" href="/modules/services">About module</Link>
        <Link className="button" href="/">Z-Life home</Link>
      </div>
    </header>
  );
}

export default async function ServicesPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "ensure_personal_workspace",
  );
  if (workspaceError || !workspaceId) {
    throw workspaceError ?? new Error("Workspace unavailable.");
  }

  const requestsResult = await supabase
    .from("service_requests")
    .select("id,category,title,description,service_address,status,external_provider,existing_relationship,billable_event_confirmed,inspection_scheduled_at,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (missingServicesSchema(requestsResult.error)) {
    return (
      <main className="projects-page">
        <ServicesHeader />
        <section style={{ display: "grid", gap: 22, maxWidth: 900 }}>
          <section className="auth-card" style={{ maxWidth: "none" }}>
            <p className="panel-label">Development readiness</p>
            <h1 style={{ margin: "6px 0 10px" }}>Services is ready in code and waiting for its database migration.</h1>
            <p className="auth-copy" style={{ maxWidth: 760 }}>
              ZLife will keep service requests inside the signed-in workspace until the Services schema exists. The marketplace bridge remains disconnected, so this screen cannot send a lead to Ziepher Match, schedule an inspection, or create a charge.
            </p>
            <p className="auth-copy" style={{ maxWidth: 760 }}>
              Required repository migration: <code>20260915003000_zlife_services_foundation.sql</code>. Applying a production migration remains a controlled release action.
            </p>
            <div className="inline-actions" style={{ marginTop: 14 }}>
              <Link className="button primary" href="/modules/services">View Services plan</Link>
              <Link className="button" href="/">Back to ZLife</Link>
            </div>
          </section>
        </section>
      </main>
    );
  }

  if (requestsResult.error) throw requestsResult.error;
  const requests = requestsResult.data ?? [];
  const openCount = requests.filter((item) => !["closed", "canceled"].includes(item.status)).length;
  const inspectionCount = requests.filter((item) => item.status === "inspection_scheduled").length;
  const externallyLinkedCount = requests.filter((item) => Boolean(item.external_provider)).length;

  return (
    <main className="projects-page">
      <ServicesHeader />
      <section style={{ display: "grid", gap: 22, maxWidth: 1180 }}>
        <div>
          <p className="panel-label">Connected service requests</p>
          <h1 style={{ margin: "6px 0 8px" }}>Find help without turning ZLife into another disconnected marketplace.</h1>
          <p className="auth-copy" style={{ maxWidth: 860, margin: 0 }}>
            ZLife owns your request history and context. Ziepher Match remains a separate matching engine behind an explicit provider boundary. This foundation records requests only; no marketplace lead, message, inspection, or billable event is created automatically.
          </p>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Open requests</p><h2 style={{ fontSize: 34, margin: "8px 0" }}>{openCount}</h2><p>Requests still being tracked.</p></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Inspections</p><h2 style={{ fontSize: 34, margin: "8px 0" }}>{inspectionCount}</h2><p>Scheduled inspection records, once a provider bridge is active.</p></div>
          <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Marketplace-linked</p><h2 style={{ fontSize: 34, margin: "8px 0" }}>{externallyLinkedCount}</h2><p>Requests carrying an external provider reference.</p></div>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">New request</p>
          <h2 style={{ margin: "6px 0 12px" }}>What do you need help with?</h2>
          <form action={addServiceRequestAction} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
              <input className="input" name="category" maxLength={80} placeholder="Tree service, plumbing, HVAC…" required />
              <input className="input" name="title" maxLength={180} placeholder="Remove storm-damaged limb" required />
              <input className="input" name="serviceAddress" maxLength={300} placeholder="Service address (optional)" />
            </div>
            <textarea className="input" name="description" maxLength={4000} placeholder="Describe what you need, timing, access, or anything a service business should know." rows={4} />
            <div className="inline-actions">
              <button className="button primary" type="submit">Save service request</button>
              <span className="auth-copy">Saved in ZLife only. No business is contacted by this action.</span>
            </div>
          </form>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Request history</p>
          <h2 style={{ margin: "6px 0 12px" }}>Everything stays traceable.</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {requests.length === 0 ? <p className="auth-copy">No service requests yet.</p> : requests.map((item) => (
              <article className="project-card" key={item.id} style={{ minHeight: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "start" }}>
                  <div style={{ flex: "1 1 520px" }}>
                    <span className="status-pill">{item.category}</span>
                    <h3 style={{ margin: "10px 0 6px" }}>{item.title}</h3>
                    <p className="auth-copy" style={{ margin: 0 }}>{item.description || "No extra details added."}</p>
                    <p className="auth-copy" style={{ margin: "8px 0 0" }}>
                      {item.service_address || "Address not added"} · provider {item.external_provider || "not connected"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="status-pill">{item.status.replaceAll("_", " ")}</span>
                    <p className="auth-copy" style={{ margin: "8px 0 0" }}>
                      {item.billable_event_confirmed ? "Billable inspection confirmed" : "No billable event confirmed"}
                    </p>
                    {!["closed", "canceled", "inspection_scheduled"].includes(item.status) ? (
                      <form action={cancelServiceRequestAction} style={{ marginTop: 10 }}>
                        <input type="hidden" name="requestId" value={item.id} />
                        <button className="button" type="submit">Cancel request</button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="project-card">
          <p className="panel-label">Ziepher Match boundary</p>
          <h2>Request ownership stays in ZLife; marketplace economics stay in Match.</h2>
          <p>
            A future bridge can submit an approved request to Ziepher Match, receive matching and in-person inspection status, recognize existing/business-owned customers, and return attribution. The bridge must not silently create a billable inspection or copy Ziepher Match&apos;s entire database into ZLife.
          </p>
        </section>
      </section>
    </main>
  );
}
