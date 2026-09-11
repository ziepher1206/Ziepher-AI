import { NextResponse } from "next/server";
import { z } from "zod";
import { connectVercelWorkspace } from "@/lib/provider-connections/vercel";
import {
  getProviderConnection,
  revokeProviderConnection
} from "@/lib/provider-connections/store";
import { createClient } from "@/lib/supabase/server";

const connectionSchema = z.object({
  accessToken: z.string().trim().min(8).max(4096),
  teamId: z.string().trim().max(255).optional().or(z.literal(""))
});

async function authenticatedWorkspace(createIfMissing = false) {
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

  if (typeof data?.id === "string") {
    return { authenticated: true as const, workspaceId: data.id };
  }

  if (!createIfMissing) {
    return { authenticated: true as const, workspaceId: null };
  }

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "ensure_personal_workspace"
  );
  if (workspaceError || typeof workspaceId !== "string") {
    throw workspaceError ?? new Error("Could not create workspace.");
  }

  return { authenticated: true as const, workspaceId };
}

function publicConnection(connection: Awaited<ReturnType<typeof getProviderConnection>>) {
  if (!connection || connection.status === "revoked") {
    return { connected: false, status: "disconnected" as const };
  }
  return {
    connected: connection.status === "connected",
    status: connection.status,
    displayName: connection.display_name,
    accountId: connection.provider_account_id,
    teamId: connection.provider_account_id?.startsWith("team_")
      ? connection.provider_account_id
      : null,
    scopes: connection.scopes,
    needsAttentionReason: connection.needs_attention_reason
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

    return NextResponse.json(
      publicConnection(await getProviderConnection(context.workspaceId, "vercel"))
    );
  } catch (error) {
    console.error(
      "Could not read Vercel connection status:",
      error instanceof Error ? error.message : "unknown_error"
    );
    return NextResponse.json(
      { error: "Could not read Vercel connection status." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await authenticatedWorkspace(true);
    if (!context.authenticated || !context.workspaceId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const input = connectionSchema.parse(await request.json());
    const validated = await connectVercelWorkspace({
      workspaceId: context.workspaceId,
      accessToken: input.accessToken,
      teamId: input.teamId || null
    });

    return NextResponse.json({
      connected: true,
      status: "connected",
      displayName: validated.displayName,
      accountId: validated.accountId,
      teamId: validated.teamId,
      scopes: validated.scopes,
      needsAttentionReason: null
    });
  } catch (error) {
    console.error(
      "Could not connect Vercel:",
      error instanceof Error ? error.message : "unknown_error"
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          (error.message.includes("Vercel") || error.message.includes("team_"))
            ? error.message
            : "Could not connect Vercel."
      },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    const context = await authenticatedWorkspace();
    if (!context.authenticated) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (context.workspaceId) {
      await revokeProviderConnection(context.workspaceId, "vercel");
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(
      "Could not disconnect Vercel:",
      error instanceof Error ? error.message : "unknown_error"
    );
    return NextResponse.json({ error: "Could not disconnect Vercel." }, { status: 500 });
  }
}
