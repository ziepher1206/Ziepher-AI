import "server-only";

const VERCEL_API_ORIGIN = "https://api.vercel.com";

type VercelProjectResponse = {
  id?: unknown;
  name?: unknown;
  accountId?: unknown;
};

type VercelProjectListResponse = {
  projects?: unknown;
};

export type VercelProjectTarget = {
  id: string;
  name: string;
  orgId: string;
};

function nonEmptyString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Vercel returned an invalid ${label}.`);
  }
  return value.trim();
}

function normalizeTarget(data: VercelProjectResponse): VercelProjectTarget {
  const id = nonEmptyString(data.id, "project ID");
  const name = nonEmptyString(data.name, "project name");
  const orgId = nonEmptyString(data.accountId, "account ID");

  if (!/^prj_[A-Za-z0-9]+$/.test(id)) {
    throw new Error("Vercel returned an unexpected project ID format.");
  }
  if (id.length > 255 || name.length > 255 || orgId.length > 255) {
    throw new Error("Vercel project identity is unexpectedly long.");
  }

  return { id, name, orgId };
}

function projectRequestUrl(pathname: string, teamId?: string | null) {
  const url = new URL(pathname, VERCEL_API_ORIGIN);
  if (teamId?.trim()) url.searchParams.set("teamId", teamId.trim());
  return url;
}

async function fetchVercelProjectJson<T>(accessToken: string, url: URL) {
  const token = accessToken.trim();
  if (!token) throw new Error("A connected Vercel access token is required.");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Vercel project not found for the connected account or team.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Vercel project access was denied. Reconnect Vercel or check the selected team.");
    }
    throw new Error(`Vercel project request failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function getVercelProjectTarget(
  accessToken: string,
  projectIdOrName: string,
  teamId?: string | null
): Promise<VercelProjectTarget> {
  const projectRef = projectIdOrName.trim();
  if (!projectRef || projectRef.length > 255) {
    throw new Error("A valid Vercel project ID or name is required.");
  }

  const data = await fetchVercelProjectJson<VercelProjectResponse>(
    accessToken,
    projectRequestUrl(`/v9/projects/${encodeURIComponent(projectRef)}`, teamId)
  );
  return normalizeTarget(data);
}

export async function listAccessibleVercelProjects(
  accessToken: string,
  teamId?: string | null
): Promise<VercelProjectTarget[]> {
  const url = projectRequestUrl("/v10/projects", teamId);
  url.searchParams.set("limit", "100");

  const data = await fetchVercelProjectJson<VercelProjectListResponse>(
    accessToken,
    url
  );
  if (!Array.isArray(data.projects)) {
    throw new Error("Vercel returned an invalid project list.");
  }

  const expectedOrgId = teamId?.trim() || null;
  const targets: VercelProjectTarget[] = [];
  for (const candidate of data.projects) {
    if (!candidate || typeof candidate !== "object") continue;
    try {
      const target = normalizeTarget(candidate as VercelProjectResponse);
      if (expectedOrgId && target.orgId !== expectedOrgId) continue;
      targets.push(target);
    } catch {
      // Ignore malformed list entries. Exact binding performs a second authoritative lookup.
    }
  }

  return targets.sort((left, right) => left.name.localeCompare(right.name));
}
