import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderConnectionsPanel } from "@/components/provider-connections-panel";
import { createClient } from "@/lib/supabase/server";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  return (
    <main className="settings-page">
      <section className="settings-intro">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER AI</div>
            <div className="brand-subtitle">CONTROL PLANE</div>
          </div>
        </div>
        <span className="panel-label" style={{ marginTop: 30 }}>
          Settings
        </span>
        <h1>Connected rails</h1>
        <p>
          Connect the external services Ziepher needs for authorization and infrastructure.
          Ziepher owns the workflow; providers supply the rails.
        </p>
        <div className="inline-actions">
          <Link className="button" href="/">
            Back to studio
          </Link>
          <Link className="button" href="/settings/billing">
            Billing settings
          </Link>
        </div>
      </section>

      <section className="billing-shell">
        <ProviderConnectionsPanel />
      </section>
    </main>
  );
}
