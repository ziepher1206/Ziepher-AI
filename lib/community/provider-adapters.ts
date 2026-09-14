import {
  shouldUseZLifeMock,
  type ZLifeMockCapability,
} from "./dev-mode";

type EnvLike = Readonly<Record<string, string | undefined>>;

export type ZLifeProviderMode = "mock" | "live";

export type ZLifeDevelopmentMock = {
  kind: "zlife-development-mock";
  mockId: string;
  capability: ZLifeMockCapability;
  operation: string;
  developmentData: true;
  externalRequestSent: false;
  note: "Development data only. No external provider was contacted.";
};

export type ZLifeProviderExecution<T> = {
  capability: ZLifeMockCapability;
  operation: string;
  mode: ZLifeProviderMode;
  provider: string;
  developmentData: boolean;
  data: T | ZLifeDevelopmentMock;
};

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stablePayload(value: unknown) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function createZLifeDevelopmentMock(
  capability: ZLifeMockCapability,
  operation: string,
  payload?: unknown,
): ZLifeDevelopmentMock {
  const fingerprint = stableHash(
    `${capability}:${operation}:${stablePayload(payload)}`,
  );

  return {
    kind: "zlife-development-mock",
    mockId: `zlife-dev-${capability}-${fingerprint}`,
    capability,
    operation,
    developmentData: true,
    externalRequestSent: false,
    note: "Development data only. No external provider was contacted.",
  };
}

/**
 * Shared boundary for provider-facing actions that may contact paid or external
 * services. In contributor dev mode, the corresponding mock flag wins before
 * the live callback can run.
 */
export async function runZLifeProviderAction<T>(input: {
  capability: ZLifeMockCapability;
  operation: string;
  payload?: unknown;
  liveProvider: string;
  live: () => Promise<T>;
  env?: EnvLike;
}): Promise<ZLifeProviderExecution<T>> {
  const env = input.env ?? process.env;

  if (shouldUseZLifeMock(input.capability, env)) {
    return {
      capability: input.capability,
      operation: input.operation,
      mode: "mock",
      provider: "zlife-development-mock",
      developmentData: true,
      data: createZLifeDevelopmentMock(
        input.capability,
        input.operation,
        input.payload,
      ),
    };
  }

  const data = await input.live();
  return {
    capability: input.capability,
    operation: input.operation,
    mode: "live",
    provider: input.liveProvider,
    developmentData: false,
    data,
  };
}

/**
 * Defense-in-depth guard for low-level provider clients. High-level workflows
 * should normally use runZLifeProviderAction; direct clients must still refuse
 * outbound calls when their mock capability is active.
 */
export function assertZLifeLiveProviderAllowed(
  capability: ZLifeMockCapability,
  env: EnvLike = process.env,
) {
  if (shouldUseZLifeMock(capability, env)) {
    throw new Error(
      `Live ${capability} provider access is blocked by ZLife development mock mode.`,
    );
  }
}
