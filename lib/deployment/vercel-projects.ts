import "server-only";

const VERCEL_API_ORIGIN = "https://api.vercel.com";

type VercelProjectResponse = {
  id?: unknown;
  name?: unknown;
  accountId?: unknown;
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

export async function getVercelProjectTarget(
  accessToken: string,
  projectIdOrName: string,
  teamId?: string | null
): Promise<VercelProjectTarget> {
  const token = accessToken.trim();
  const projectRef = projectIdOrName.trim();
  if (!token) throw new Error("VERCEL_TOKEN is not configured.");
  if (!projectRef || projectRef.length > 255) {
    throw new Error("A valid Vercel project ID or name is required.");
  }

  const url = new URL(
    `/v9/projects/${encodeURIComponent(projectRef)}`,
    VERCEL_API_ORIGIN
  );
  if (teamId?.trim()) url.searchParams.set("teamId", teamId.trim());

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
      throw new Error("Vercel project not found for the configured account or team.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Vercel project access was denied. Check the configured token and team.");
    }
    throw new Error(`Vercel project lookup failed with HTTP ${response.status}.`);
  }

  const data = (await response.json()) as VercelProjectResponse;
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
