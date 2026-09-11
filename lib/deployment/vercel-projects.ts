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

export type VercelProjectCreationResult = {
  target: VercelProjectTarget;
  outcome: "existing" | "created" | "reconciled";
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

function requireAccessToken(accessToken: string) {
  const token = accessToken.trim();
  if (!token) throw new Error("A connected Vercel access token is required.");
  return token;
}

function throwVercelResponseError(response: Response, operation: string): never {
  if (response.status === 401 || response.status === 403) {
    throw new Error("Vercel project access was denied. Reconnect Vercel or check the selected team.");
  }
  throw new Error(`Vercel ${operation} failed with HTTP ${response.status}.`);
}

async function requestVercel(
  accessToken: string,
  url: URL,
  init: RequestInit
): Promise<Response> {
  const token = requireAccessToken(accessToken);
  return fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
}

async function findVercelProjectTarget(
  accessToken: string,
  projectIdOrName: string,
  teamId?: string | null
): Promise<VercelProjectTarget | null> {
  const projectRef = projectIdOrName.trim();
  if (!projectRef || projectRef.length > 255) {
    throw new Error("A valid Vercel project ID or name is required.");
  }

  const response = await requestVercel(
    accessToken,
    projectRequestUrl(`/v9/projects/${encodeURIComponent(projectRef)}`, teamId),
    { method: "GET" }
  );
  if (response.status === 404) return null;
  if (!response.ok) throwVercelResponseError(response, "project lookup");
  return normalizeTarget((await response.json()) as VercelProjectResponse);
}

function assertExpectedAccount(target: VercelProjectTarget, teamId?: string | null) {
  const expectedOrgId = teamId?.trim() || null;
  if (expectedOrgId && target.orgId !== expectedOrgId) {
    throw new Error("Vercel returned a project outside the connected workspace team.");
  }
}

export async function getVercelProjectTarget(
  accessToken: string,
  projectIdOrName: string,
  teamId?: string | null
): Promise<VercelProjectTarget> {
  const target = await findVercelProjectTarget(accessToken, projectIdOrName, teamId);
  if (!target) {
    throw new Error("Vercel project not found for the connected account or team.");
  }
  assertExpectedAccount(target, teamId);
  return target;
}

export async function listAccessibleVercelProjects(
  accessToken: string,
  teamId?: string | null
): Promise<VercelProjectTarget[]> {
  const url = projectRequestUrl("/v10/projects", teamId);
  url.searchParams.set("limit", "100");

  const response = await requestVercel(accessToken, url, { method: "GET" });
  if (!response.ok) throwVercelResponseError(response, "project list request");

  const data = (await response.json()) as VercelProjectListResponse;
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

export async function createVercelProject(
  accessToken: string,
  projectName: string,
  teamId?: string | null
): Promise<VercelProjectCreationResult> {
  const name = projectName.trim();
  if (!name || name.length > 255) {
    throw new Error("A valid Vercel project name is required.");
  }

  const existing = await findVercelProjectTarget(accessToken, name, teamId);
  if (existing) {
    assertExpectedAccount(existing, teamId);
    return { target: existing, outcome: "existing" };
  }

  const createUrl = projectRequestUrl("/v11/projects", teamId);
  let createResponse: Response;
  try {
    createResponse = await requestVercel(accessToken, createUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    });
  } catch (caught) {
    try {
      const reconciled = await findVercelProjectTarget(accessToken, name, teamId);
      if (reconciled) {
        assertExpectedAccount(reconciled, teamId);
        return { target: reconciled, outcome: "reconciled" };
      }
    } catch {
      // Preserve the fail-closed ambiguity below if the provider cannot be authoritatively queried.
    }
    throw new Error(
      `Vercel project creation outcome is unknown. Check the connected Vercel account before retrying. ${caught instanceof Error ? caught.message : ""}`.trim()
    );
  }

  if (createResponse.ok) {
    const target = normalizeTarget(
      (await createResponse.json()) as VercelProjectResponse
    );
    assertExpectedAccount(target, teamId);
    return { target, outcome: "created" };
  }

  if (createResponse.status === 409) {
    const reconciled = await findVercelProjectTarget(accessToken, name, teamId);
    if (reconciled) {
      assertExpectedAccount(reconciled, teamId);
      return { target: reconciled, outcome: "reconciled" };
    }
    throw new Error(
      "Vercel reports a project-name conflict, but the project is not visible to this connected account."
    );
  }

  if (createResponse.status === 401 || createResponse.status === 403) {
    throwVercelResponseError(createResponse, "project creation");
  }

  try {
    const reconciled = await findVercelProjectTarget(accessToken, name, teamId);
    if (reconciled) {
      assertExpectedAccount(reconciled, teamId);
      return { target: reconciled, outcome: "reconciled" };
    }
  } catch {
    // The non-success response remains authoritative unless a project can be reconciled.
  }

  throwVercelResponseError(createResponse, "project creation");
}
