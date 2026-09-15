import Link from "next/link";
import { redirect } from "next/navigation";

import { advanceMockMatchAction } from "@/app/services/mock-match/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function MockMatchLabPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  if (process.env.ZLIFE_DEV_MODE !== "true" || process.env.ZLIFE_MOCK_MATCH !== "true") {
    return (
      <main className="projects-page">
        <header className="projects-header">
          <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">Z-LIFE</div><div className="brand-subtitle">SERVICES · MOCK MATCH LAB</div></div></div>
          <Link className="button" href="/services">Back to Services</Link>
        </header>
        <section className="auth-card" style={{ maxWidth: 820 }}>
          <p className="panel-label">Fail-closed development tool</p>
          <h1>Mock Ziepher Match is disabled.</h1>
          <p className="auth-copy">This lab only runs when both ZLIFE_DEV_MODE and ZLIFE_MOCK_MATCH are explicitly true. It never falls back to the real marketplace.</p>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: requests, error } = await supabase
    .from("service_requests")
    .select("id,title,category,status,external_provider,external_request_id,billable_event_confirmed,inspection_scheduled_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">Z-LIFE</div><div className="brand-subtitle">SERVICES · MOCK MATCH LAB</div></div></div>
        <div className="inline-actions"><Link className="button" href="/services">Services</Link><Link className="button" href="/modules/services">About module</Link></div>
      </header>

      <section style={{ display: "grid", gap: 22, maxWidth: 1000 }}>
        <div>
          <p className="panel-label">Zero-cost integration exercise</p>
          <h1 style={{ margin: "6px 0 8px" }}>Test the Services lifecycle without contacting Ziepher Match.</h1>
          <p className="auth-copy" style={{ maxWidth: 820, margin: 0 }}>
            This development-only lab changes ZLife test records to mimic matching and inspection scheduling. It does not make a network call, contact a business, send a message, or confirm a billable event.
          </p>
        </div>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Workspace requests</p>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {(requests ?? []).map((item) => {
              const terminal = ["closed", "canceled"].includes(item.status);
              const realProvider = item.external_provider && item.external_provider !== "ziepher_match_mock";
              return (
                <article className="project-card" key={item.id} style={{ minHeight: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ flex: "1 1 420px" }}>
                      <span className="status-pill">{item.category}</span>
                      <h3 style={{ margin: "10px 0 4px" }}>{item.title}</h3>
                      <p className="auth-copy" style={{ margin: 0 }}>Status: {item.status.replaceAll("_", " ")} · provider: {item.external_provider || "none"}</p>
                      <p className="auth-copy" style={{ margin: "4px 0 0" }}>Billable confirmed: {item.billable_event_confirmed ? "yes" : "no"}</p>
                    </div>
                    {!terminal && !realProvider && !item.billable_event_confirmed ? (
                      <div className="inline-actions">
                        <form action={advanceMockMatchAction}>
                          <input type="hidden" name="requestId" value={item.id} />
                          <input type="hidden" name="stage" value="matched" />
                          <button className="button" type="submit">Simulate matched</button>
                        </form>
                        <form action={advanceMockMatchAction}>
                          <input type="hidden" name="requestId" value={item.id} />
                          <input type="hidden" name="stage" value="inspection_scheduled" />
                          <button className="button primary" type="submit">Simulate inspection</button>
                        </form>
                      </div>
                    ) : <span className="status-pill">Mock changes blocked</span>}
                  </div>
                </article>
              );
            })}
            {!requests?.length ? <p className="auth-copy">Create a Services request first, then use this lab to exercise the mock provider path.</p> : null}
          </div>
        </section>

        <section className="project-card">
          <p className="panel-label">Non-billing invariant</p>
          <h2>Even simulated inspection scheduling leaves billing false.</h2>
          <p>Billing requires a separate authoritative economic event in the future. This lab cannot produce one, which prevents status testing from ever becoming a charge path.</p>
        </section>
      </section>
    </main>
  );
}
