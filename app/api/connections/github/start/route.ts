import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireServerEnv } from "@/lib/env";
import { createGitHubAuthorizationUrl } from "@/lib/provider-connections/github-oauth";
import { createOAuthState } from "@/lib/provider-connections/oauth-state";

const STATE_COOKIE = "ziepher_github_oauth_state";

function callbackUrl() {
  return new URL(
    "/api/connections/github/callback",
    requireServerEnv("NEXT_PUBLIC_APP_URL")
  ).toString();
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/auth/sign-in", requireServerEnv("NEXT_PUBLIC_APP_URL"))
    );
  }

  const state = createOAuthState();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/connections/github",
    maxAge: 10 * 60
  });

  return NextResponse.redirect(
    createGitHubAuthorizationUrl({
      redirectUri: callbackUrl(),
      state
    })
  );
}
