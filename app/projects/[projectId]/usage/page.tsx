import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ projectId: string }> };

type CostEvent = {
  id: string;
  category: string;
  provider: string | null;
  operation: string;
  provider_cost_usd: number | string;
  customer_usage_usd: number | string;
  cost_metadata: Record<string, unknown> | null;
  created_at: string;
};

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  if (value > 0 && value < 0.01) return `$${value.toFixed(6)}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
}

export default async function UsagePage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,business_name,primary_domain,source_domain")
    .eq("id", projectId)
    .single();
  if (projectError || !project) notFound();

  const { data: rawEvents, error: eventsError } = await supabase
    .from("project_cost_events")
    .select("id,category,provider,operation,provider_cost_usd,customer_usage_usd,cost_metadata,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(250);
  if (eventsError) throw eventsError;

  const events = (rawEvents ?? []) as CostEvent[];
  const providerTotal = events.reduce(
    (sum, event) => sum + asNumber(event.provider_cost_usd),
    0
  );
  const customerTotal = events.reduce(
    (sum, event) => sum + asNumber(event.customer_usage_usd),
    0
  );
  const aiEvents = events.filter((event) => event.category === "ai");
  const hasMeasuredProviderCost = events.some(
    (event) => asNumber(event.provider_cost_usd) > 0
  );

  const domain = project.primary_domain ?? project.source_domain;

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-title">SITEREFINER</div>
            <div className="brand-subtitle">USAGE & COST</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}`}>
            Website overview
          </Link>
          <Link className="button" href="/projects">
            All websites
          </Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 24 }}>
        <div>
          <p className="panel-label">{project.business_name ?? project.name}</p>
          <h1 style={{ margin: "6px 0 10px" }}>Website usage and recorded cost</h1>
          <p className="auth-copy" style={{ maxWidth: 800 }}>
            {domain ? `${domain} · ` : ""}Provider cost and customer usage are kept separate so the business can see what the underlying services cost versus what SiteRefiner records as customer usage.
          </p>
        </div>

        <section className="project-grid" style={{ marginTop: 0 }}>
          <article className="project-card">
            <p className="panel-label">Recorded provider cost</p>
            <h2>{money(providerTotal)}</h2>
            <p>Underlying provider cost recorded for the latest {events.length} ledger event{events.length === 1 ? "" : "s"} shown here.</p>
          </article>
          <article className="project-card">
            <p className="panel-label">Recorded customer usage</p>
            <h2>{money(customerTotal)}</h2>
            <p>This is usage-accounting data only. It does not charge a card or enable billing.</p>
          </article>
          <article className="project-card">
            <p className="panel-label">AI operations</p>
            <h2>{aiEvents.length}</h2>
            <p>AI-related cost events currently attached to this website.</p>
          </article>
        </section>

        {!hasMeasuredProviderCost ? (
          <section className="project-card">
            <p className="panel-label">Metering status</p>
            <h2>Exact provider spend is not fully metered yet</h2>
            <p>
              The ledger is wired to receive model-usage costs, but the current build worker still records provider cost as $0 for its AI build event. SiteRefiner will not label that as a real zero-cost build until token usage and provider pricing are measured and written by the AI provider integration.
            </p>
          </section>
        ) : null}

        <section>
          <p className="panel-label">Cost ledger</p>
          {events.length ? (
            <div className="project-grid" style={{ marginTop: 12 }}>
              {events.map((event) => {
                const model = typeof event.cost_metadata?.model === "string"
                  ? event.cost_metadata.model
                  : null;
                return (
                  <article className="project-card" key={event.id}>
                    <div className="project-card-top">
                      <span className="status-pill">{event.category}</span>
                      <span className="project-version">{event.provider ?? "internal"}</span>
                    </div>
                    <h3>{event.operation.replaceAll("_", " ")}</h3>
                    {model ? <p>{model}</p> : null}
                    <p>
                      Provider {money(asNumber(event.provider_cost_usd))} · Customer usage {money(asNumber(event.customer_usage_usd))}
                    </p>
                    <small>{new Date(event.created_at).toLocaleString()}</small>
                  </article>
                );
              })}
            </div>
          ) : (
            <section className="empty-projects" style={{ marginTop: 12 }}>
              <h2>No metered usage yet</h2>
              <p>When billable provider operations are recorded for this website, they will appear here.</p>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
