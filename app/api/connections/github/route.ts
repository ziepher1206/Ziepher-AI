import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProviderConnection,
  revokeProviderConnection
} from "@/lib/provider-connections/store";

async function authenticatedWorkspace() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { authenticated: false as const, workspaceId: null };

  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  return {
    authenticated: true as const,
    workspaceId: typeof data?.id === "string" ? data.id : null
  };
}

export async function GET() {
  try {
    const context = await authenticatedWorkspace();
    if (!context.authenticated) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!context.workspaceId) {
      return NextResponse.json({ connected: false, status: "disconnected" });
    }

    const connection = await getProviderConnection(context.workspaceId, "github");
    if (!connection || connection.status === "revoked") {
      return NextResponse.json({ connected: false, status: "disconnected" });
    }

    return NextResponse.json({
      connected: connection.status === "connected",
      status: connection.status,
      displayName: connection.display_name,
      scopes: connection.scopes,
      accessTokenExpiresAt: connection.access_token_expires_at,
      refreshTokenExpiresAt: connection.refresh_token_expires_at,
      needsAttentionReason: connection.needs_attention_reason
    });
  } catch (error) {
    console.error(
      "Could not read GitHub connection status:",
      error instanceof Error ? error.message : "unknown_error"
    );
    return NextResponse.json({ error: "Could not read GitHub connection status." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const context = await authenticatedWorkspace();
    if (!context.authenticated) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (context.workspaceId) {
      await revokeProviderConnection(context.workspaceId, "github");
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(
      "Could not disconnect GitHub:",
      error instanceof Error ? error.message : "unknown_error"
    );
    return NextResponse.json({ error: "Could not disconnect GitHub." }, { status: 500 });
  }
}
