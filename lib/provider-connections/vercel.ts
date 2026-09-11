import "server-only";

import {
  getProviderConnection,
  upsertProviderConnection
} from "./store";

const VERCEL_API_ORIGIN = "https://api.vercel.com";

type TokenMetadataResponse = {
  token?: {
    scopes?: Array<{ type?: unknown }>;
  };
};

type UserResponse = {
  user?: {
    id?: unknown;
    username?: unknown;
    name?: unknown;
    email?: unknown;
  };
  id?: unknown;
  username?: unknown;
  name?: unknown;
  email?: unknown;
};

type TeamResponse = {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
};

export type ValidatedVercelConnection = {
  accountId: string;
  displayName: string;
  teamId: string | null;
  scopes: string[];
};

export type UsableVercelConnection = ValidatedVercelConnection & {
  accessToken: string;
};

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function vercelJson<T>(accessToken: string, pathname: string) {
  const response = await fetch(new URL(pathname, VERCEL_API_ORIGIN), {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Vercel rejected this access token or account scope.");
    }
    if (response.status === 404) {
      throw new Error("The requested Vercel account or team was not found.");
    }
    throw new Error(`Vercel credential validation failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function validateVercelConnection(
  accessToken: string,
  teamId?: string | null
): Promise<ValidatedVercelConnection> {
  const token = accessToken.trim();
  if (!token || token.length > 4096) {
    throw new Error("A valid Vercel access token is required.");
  }

  const metadata = await vercelJson<TokenMetadataResponse>(
    token,
    "/v5/user/tokens/current"
  );
  const scopes = Array.from(
    new Set(
      (metadata.token?.scopes ?? [])
        .map((scope) => stringOrNull(scope.type))
        .filter((value): value is string => Boolean(value))
    )
  );

  const normalizedTeamId = teamId?.trim() || null;
  if (normalizedTeamId) {
    if (!/^team_[A-Za-z0-9]+$/.test(normalizedTeamId)) {
      throw new Error("Vercel team ID must start with team_.");
    }
    const team = await vercelJson<TeamResponse>(
      token,
      `/v2/teams/${encodeURIComponent(normalizedTeamId)}`
    );
    const id = stringOrNull(team.id);
    if (!id || id !== normalizedTeamId) {
      throw new Error("Vercel returned an unexpected team identity.");
    }
    return {
      accountId: id,
      teamId: id,
      displayName: stringOrNull(team.name) ?? stringOrNull(team.slug) ?? id,
      scopes
    };
  }

  const userPayload = await vercelJson<UserResponse>(token, "/v2/user");
  const user = userPayload.user ?? userPayload;
  const id = stringOrNull(user.id);
  if (!id) throw new Error("Vercel returned an invalid user identity.");

  return {
    accountId: id,
    teamId: null,
    displayName:
      stringOrNull(user.name) ??
      stringOrNull(user.username) ??
      stringOrNull(user.email) ??
      "Vercel account",
    scopes
  };
}

export async function connectVercelWorkspace(input: {
  workspaceId: string;
  accessToken: string;
  teamId?: string | null;
}) {
  const validated = await validateVercelConnection(
    input.accessToken,
    input.teamId
  );

  await upsertProviderConnection({
    workspaceId: input.workspaceId,
    provider: "vercel",
    providerAccountId: validated.accountId,
    displayName: validated.displayName,
    scopes: validated.scopes,
    accessToken: input.accessToken.trim()
  });

  return validated;
}

export async function getUsableVercelConnection(
  workspaceId: string
): Promise<UsableVercelConnection> {
  const connection = await getProviderConnection(workspaceId, "vercel");
  if (!connection || connection.status !== "connected" || !connection.accessToken) {
    throw new Error(
      "Connect Vercel for this workspace before binding or deploying a Vercel project."
    );
  }

  const accountId = connection.provider_account_id?.trim();
  if (!accountId) {
    throw new Error("The workspace Vercel connection is missing its account identity.");
  }

  return {
    accessToken: connection.accessToken,
    accountId,
    teamId: accountId.startsWith("team_") ? accountId : null,
    displayName: connection.display_name ?? "Vercel account",
    scopes: connection.scopes ?? []
  };
}
