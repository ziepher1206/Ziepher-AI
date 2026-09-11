import "server-only";

import { requireServerEnv } from "../env";
import {
  getProviderConnection,
  markProviderConnectionNeedsAttention,
  rotateProviderTokens
} from "./store";

const AUTH_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const REFRESH_BUFFER_MS = 5 * 60_000;

type GitHubTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function expiresAt(seconds?: number, nowMs = Date.now()) {
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
    ? new Date(nowMs + seconds * 1000).toISOString()
    : undefined;
}

export function createGitHubAuthorizationUrl(input: {
  redirectUri: string;
  state: string;
}) {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", requireServerEnv("GITHUB_OAUTH_CLIENT_ID"));
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", "repo read:user offline_access");
  return url.toString();
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  const payload = (await response.json()) as GitHubTokenResponse;
  if (!response.ok || payload.error || !payload.access_token) {
    const code = payload.error ?? `http_${response.status}`;
    const detail = payload.error_description ? `: ${payload.error_description}` : "";
    throw new Error(`GitHub OAuth token request failed: ${code}${detail}`);
  }
  return payload;
}

export async function exchangeGitHubAuthorizationCode(input: {
  code: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams({
    client_id: requireServerEnv("GITHUB_OAUTH_CLIENT_ID"),
    client_secret: requireServerEnv("GITHUB_OAUTH_CLIENT_SECRET"),
    code: input.code,
    redirect_uri: input.redirectUri
  });
  return tokenRequest(body);
}

export async function refreshGitHubOAuthToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: requireServerEnv("GITHUB_OAUTH_CLIENT_ID"),
    client_secret: requireServerEnv("GITHUB_OAUTH_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  return tokenRequest(body);
}

export async function getUsableGitHubAccessToken(workspaceId: string) {
  const connection = await getProviderConnection(workspaceId, "github");
  if (!connection || connection.status === "revoked") {
    throw new Error("GitHub is not connected.");
  }

  const expiryMs = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : Number.POSITIVE_INFINITY;

  if (
    connection.status === "connected" &&
    connection.accessToken &&
    expiryMs - Date.now() > REFRESH_BUFFER_MS
  ) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    await markProviderConnectionNeedsAttention(
      workspaceId,
      "github",
      "GitHub authorization must be renewed."
    );
    throw new Error("GitHub reauthorization required.");
  }

  try {
    const refreshed = await refreshGitHubOAuthToken(connection.refreshToken);
    const rotated = await rotateProviderTokens({
      workspaceId,
      provider: "github",
      accessToken: refreshed.access_token!,
      refreshToken: refreshed.refresh_token,
      accessTokenExpiresAt: expiresAt(refreshed.expires_in),
      refreshTokenExpiresAt: expiresAt(refreshed.refresh_token_expires_in)
    });
    return rotated.accessToken!;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("bad_refresh_token")) {
      await markProviderConnectionNeedsAttention(
        workspaceId,
        "github",
        "GitHub refresh token expired or was revoked."
      );
    }
    throw error;
  }
}
