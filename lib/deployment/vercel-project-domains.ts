import "server-only";

const VERCEL_API_ORIGIN = "https://api.vercel.com";

export type VercelProjectDomain = {
  name: string;
  apexName: string | null;
  projectId: string | null;
  verified: boolean;
  verification: Array<{
    type: string;
    domain: string | null;
    value: string | null;
    reason: string | null;
  }>;
};

export type VercelDomainConfig = {
  configured: boolean;
  misconfigured: boolean;
  nameservers: string[];
  cnames: string[];
  aRecords: string[];
};

type DomainResponse = Record<string, unknown>;

function requestUrl(pathname: string, teamId?: string | null) {
  const url = new URL(pathname, VERCEL_API_ORIGIN);
  if (teamId?.trim()) url.searchParams.set("teamId", teamId.trim());
  return url;
}

async function vercelRequest<T>(
  accessToken: string,
  url: URL,
  init: RequestInit = {}
): Promise<T> {
  const token = accessToken.trim();
  if (!token) throw new Error("A connected Vercel access token is required.");

  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      "content-type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const nested = body.error;
    const providerMessage =
      nested && typeof nested === "object" && "message" in nested && typeof nested.message === "string"
        ? nested.message
        : null;
    if (response.status === 401 || response.status === 403) {
      throw new Error(providerMessage ?? "Vercel denied access to this project or domain.");
    }
    if (response.status === 404) {
      throw new Error(providerMessage ?? "The Vercel project domain could not be found.");
    }
    throw new Error(providerMessage ?? `Vercel project-domain request failed with HTTP ${response.status}.`);
  }

  return body as T;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
}

function normalizeVerification(value: unknown): VercelProjectDomain["verification"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      type: typeof item.type === "string" ? item.type : "TXT",
      domain: nullableString(item.domain),
      value: nullableString(item.value),
      reason: nullableString(item.reason)
    }));
}

function normalizeDomain(data: DomainResponse): VercelProjectDomain {
  if (typeof data.name !== "string" || !data.name.trim()) {
    throw new Error("Vercel returned an invalid project domain.");
  }
  return {
    name: data.name.trim().toLowerCase(),
    apexName: nullableString(data.apexName),
    projectId: nullableString(data.projectId),
    verified: data.verified === true,
    verification: normalizeVerification(data.verification)
  };
}

function normalizeDomainConfig(data: DomainResponse): VercelDomainConfig {
  const misconfigured = data.misconfigured === true;
  return {
    configured: !misconfigured,
    misconfigured,
    nameservers: stringList(data.nameservers),
    cnames: stringList(data.cnames),
    aRecords: stringList(data.aValues ?? data.aRecords)
  };
}

export async function getVercelProjectDomain(input: {
  accessToken: string;
  projectIdOrName: string;
  domain: string;
  teamId?: string | null;
}) {
  const data = await vercelRequest<DomainResponse>(
    input.accessToken,
    requestUrl(
      `/v9/projects/${encodeURIComponent(input.projectIdOrName)}/domains/${encodeURIComponent(input.domain)}`,
      input.teamId
    )
  );
  return normalizeDomain(data);
}

export async function getVercelDomainConfig(input: {
  accessToken: string;
  domain: string;
  teamId?: string | null;
}) {
  const data = await vercelRequest<DomainResponse>(
    input.accessToken,
    requestUrl(`/v6/domains/${encodeURIComponent(input.domain)}/config`, input.teamId)
  );
  return normalizeDomainConfig(data);
}

export async function addVercelProjectDomain(input: {
  accessToken: string;
  projectIdOrName: string;
  domain: string;
  teamId?: string | null;
}) {
  const data = await vercelRequest<DomainResponse>(
    input.accessToken,
    requestUrl(
      `/v9/projects/${encodeURIComponent(input.projectIdOrName)}/domains`,
      input.teamId
    ),
    {
      method: "POST",
      body: JSON.stringify({ name: input.domain })
    }
  );
  return normalizeDomain(data);
}

export async function verifyVercelProjectDomain(input: {
  accessToken: string;
  projectIdOrName: string;
  domain: string;
  teamId?: string | null;
}) {
  const data = await vercelRequest<DomainResponse>(
    input.accessToken,
    requestUrl(
      `/v9/projects/${encodeURIComponent(input.projectIdOrName)}/domains/${encodeURIComponent(input.domain)}/verify`,
      input.teamId
    ),
    { method: "POST" }
  );
  return normalizeDomain(data);
}
