import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ProviderConnectionsPanel,
  type GitHubConnection
} from "@/components/provider-connections-panel";
import { isSupabaseConfigured } from "@/lib/env";
import { getProviderConnection } from "@/lib/provider-connections/store";
import { createClient } from "@/lib/supabase/server";

const DISCONNECTED: GitHubConnection = {
  connected: false,
  status: "disconnected"
};

export default async function ConnectionsPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (workspaceError) throw workspaceError;

  let initialConnection = DISCONNECTED;
  if (typeof workspace?.id === "string") {
    const connection = await getProviderConnection(workspace.id, "github");
    if (connection && connection.status !== "revoked") {
      initialConnection = {
        connected: connection.status === "connected",
        status: connection.status,
        displayName: connection.display_name,
        scopes: connection.scopes,
        accessTokenExpiresAt: connection.access_token_expires_at,
        refreshTokenExpiresAt: connection.refresh_token_expires_at,
        needsAttentionReason: connection.needs_attention_reason
      };
    }
  }

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
        <ProviderConnectionsPanel initialConnection={initialConnection} />
      </section>
    </main>
  );
}
