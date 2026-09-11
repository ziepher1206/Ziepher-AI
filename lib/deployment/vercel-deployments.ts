import "server-only";

const VERCEL_API_ORIGIN = "https://api.vercel.com";

const knownStates = new Set([
  "BLOCKED",
  "BUILDING",
  "CANCELED",
  "DELETED",
  "ERROR",
  "INITIALIZING",
  "QUEUED",
  "READY"
]);

type RawDeployment = {
  uid?: unknown;
  projectId?: unknown;
  url?: unknown;
  readyState?: unknown;
  state?: unknown;
  target?: unknown;
  meta?: unknown;
};

type ListResponse = {
  deployments?: unknown;
};

export type VercelDeploymentObservation = {
  id: string;
  state: string;
  url: string | null;
  target: string | null;
};

export type VercelDeploymentTarget = {
  projectId: string;
  orgId: string;
};

function normalizeUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const url = raw.startsWith("https://") ? raw : `https://${raw}`;
  if (!/^https:\/\/[^\s]+$/i.test(url)) {
    throw new Error("Vercel returned an invalid deployment URL.");
  }
  return url;
}

function metadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function classifyVercelDeployment(
  observation: VercelDeploymentObservation
): "ready" | "pending" | "failed" {
  if (observation.state === "READY") return "ready";
  if (["ERROR", "CANCELED", "BLOCKED", "DELETED"].includes(observation.state)) {
    return "failed";
  }
  return "pending";
}

export async function findVercelDeploymentByZiepherId(
  accessToken: string,
  target: VercelDeploymentTarget,
  ziepherDeploymentId: string,
  ziepherProjectId: string,
  environment: "preview" | "production"
): Promise<VercelDeploymentObservation | null> {
  const token = accessToken.trim();
  if (!token) throw new Error("VERCEL_TOKEN is not configured.");
  if (!/^prj_[A-Za-z0-9]+$/.test(target.projectId)) {
    throw new Error("Vercel deployment target has an invalid project ID.");
  }
  if (!target.orgId.trim()) {
    throw new Error("Vercel deployment target has no account ID.");
  }

  const url = new URL("/v6/deployments", VERCEL_API_ORIGIN);
  url.searchParams.set("projectId", target.projectId);
  url.searchParams.set("limit", "100");
  if (target.orgId.startsWith("team_")) {
    url.searchParams.set("teamId", target.orgId);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Vercel deployment reconciliation access was denied.");
    }
    throw new Error(`Vercel deployment reconciliation failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as ListResponse;
  if (!Array.isArray(payload.deployments)) {
    throw new Error("Vercel returned an invalid deployment list.");
  }

  const matches = payload.deployments.filter((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const meta = metadata((entry as RawDeployment).meta);
    return meta.ziepherDeploymentId === ziepherDeploymentId;
  }) as RawDeployment[];

  if (matches.length > 1) {
    throw new Error("Multiple Vercel deployments share the same Ziepher deployment identity.");
  }
  if (!matches.length) return null;

  const deployment = matches[0];
  if (deployment.projectId !== target.projectId) {
    throw new Error("Vercel reconciliation returned a deployment from the wrong project.");
  }

  const meta = metadata(deployment.meta);
  if (meta.ziepherProjectId !== ziepherProjectId) {
    throw new Error("Vercel deployment metadata does not match the Ziepher project.");
  }
  if (meta.ziepherEnvironment !== environment) {
    throw new Error("Vercel deployment metadata does not match the requested environment.");
  }

  const id = typeof deployment.uid === "string" ? deployment.uid.trim() : "";
  if (!id.startsWith("dpl_")) {
    throw new Error("Vercel returned an invalid deployment ID.");
  }

  const rawState =
    typeof deployment.readyState === "string"
      ? deployment.readyState
      : typeof deployment.state === "string"
        ? deployment.state
        : "";
  const state = rawState.toUpperCase();
  if (!knownStates.has(state)) {
    throw new Error(`Vercel returned an unexpected deployment state: ${rawState || "missing"}.`);
  }

  const targetEnvironment =
    typeof deployment.target === "string" ? deployment.target : null;
  if (environment === "production" && targetEnvironment !== "production") {
    throw new Error("Vercel deployment target does not match the production request.");
  }
  if (environment === "preview" && targetEnvironment === "production") {
    throw new Error("Vercel preview reconciliation returned a production deployment.");
  }

  return {
    id,
    state,
    url: normalizeUrl(deployment.url),
    target: targetEnvironment
  };
}
