import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireServerEnv } from "@/lib/env";
import { connectGitHubFromAuthorizationCode } from "@/lib/provider-connections/github-oauth";
import { oauthStateMatches } from "@/lib/provider-connections/oauth-state";

const STATE_COOKIE = "ziepher_github_oauth_state";

function appUrl(path = "/") {
  return new URL(path, requireServerEnv("NEXT_PUBLIC_APP_URL"));
}

function callbackUrl() {
  return appUrl("/api/connections/github/callback").toString();
}

function connectionRedirect(status: "connected" | "error", reason?: string) {
  const url = appUrl("/settings/connections");
  url.searchParams.set("github", status);
  if (reason) url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (providerError) {
    return connectionRedirect("error", "authorization_denied");
  }
  if (!code || !oauthStateMatches(expectedState, state)) {
    return connectionRedirect("error", "invalid_oauth_state");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(appUrl("/auth/sign-in"));
  }

  try {
    const { data: workspaceId, error: workspaceError } = await supabase.rpc(
      "ensure_personal_workspace"
    );
    if (workspaceError || typeof workspaceId !== "string") {
      throw workspaceError ?? new Error("Workspace could not be resolved.");
    }

    await connectGitHubFromAuthorizationCode({
      workspaceId,
      code,
      redirectUri: callbackUrl()
    });

    return connectionRedirect("connected");
  } catch (error) {
    console.error(
      "GitHub connection failed:",
      error instanceof Error ? error.message : "unknown_error"
    );
    return connectionRedirect("error", "connection_failed");
  }
}
