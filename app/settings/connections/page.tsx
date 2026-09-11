import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ProviderConnectionsPanel,
  type GitHubConnection
} from "@/components/provider-connections-panel";
import {
  VercelConnectionPanel,
  type VercelConnectionStatus
} from "@/components/vercel-connection-panel";
import { isSupabaseConfigured } from "@/lib/env";
import { getProviderConnection } from "@/lib/provider-connections/store";
import { createClient } from "@/lib/supabase/server";

const DISCONNECTED_GITHUB: GitHubConnection = {
  connected: false,
  status: "disconnected"
};

const DISCONNECTED_VERCEL: VercelConnectionStatus = {
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

  let initialGitHubConnection = DISCONNECTED_GITHUB;
  let initialVercelConnection = DISCONNECTED_VERCEL;

  if (typeof workspace?.id === "string") {
    const [github, vercel] = await Promise.all([
      getProviderConnection(workspace.id, "github"),
      getProviderConnection(workspace.id, "vercel")
    ]);

    if (github && github.status !== "revoked") {
      initialGitHubConnection = {
        connected: github.status === "connected",
        status: github.status,
        displayName: github.display_name,
        scopes: github.scopes,
        accessTokenExpiresAt: github.access_token_expires_at,
        refreshTokenExpiresAt: github.refresh_token_expires_at,
        needsAttentionReason: github.needs_attention_reason
      };
    }

    if (vercel && vercel.status !== "revoked") {
      initialVercelConnection = {
        connected: vercel.status === "connected",
        status: vercel.status,
        displayName: vercel.display_name,
        accountId: vercel.provider_account_id,
        teamId: vercel.provider_account_id?.startsWith("team_")
          ? vercel.provider_account_id
          : null,
        scopes: vercel.scopes,
        needsAttentionReason: vercel.needs_attention_reason
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

      <section className="billing-shell" style={{ display: "grid", gap: 18 }}>
        <ProviderConnectionsPanel initialConnection={initialGitHubConnection} />
        <VercelConnectionPanel initialConnection={initialVercelConnection} />
      </section>
    </main>
  );
}
