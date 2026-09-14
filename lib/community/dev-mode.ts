export type ZLifeMockCapability =
  | "ai"
  | "email"
  | "sms"
  | "payments"
  | "notifications";

type EnvLike = Readonly<Record<string, string | undefined>>;

const MOCK_ENV: Record<ZLifeMockCapability, string> = {
  ai: "ZLIFE_MOCK_AI",
  email: "ZLIFE_MOCK_EMAIL",
  sms: "ZLIFE_MOCK_SMS",
  payments: "ZLIFE_MOCK_PAYMENTS",
  notifications: "ZLIFE_MOCK_NOTIFICATIONS",
};

function isTrue(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Explicit community/local development gate.
 *
 * Never infer this from NODE_ENV: preview and test processes can run with
 * production-like settings. The operator/contributor must opt into dev mode.
 */
export function isZLifeDevMode(env: EnvLike = process.env) {
  return isTrue(env.ZLIFE_DEV_MODE);
}

/**
 * Provider mocks are available only behind the top-level dev-mode gate.
 * This prevents a stray ZLIFE_MOCK_* variable from changing production behavior.
 */
export function shouldUseZLifeMock(
  capability: ZLifeMockCapability,
  env: EnvLike = process.env,
) {
  return isZLifeDevMode(env) && isTrue(env[MOCK_ENV[capability]]);
}

export function getZLifeDevModeState(env: EnvLike = process.env) {
  return {
    enabled: isZLifeDevMode(env),
    mocks: {
      ai: shouldUseZLifeMock("ai", env),
      email: shouldUseZLifeMock("email", env),
      sms: shouldUseZLifeMock("sms", env),
      payments: shouldUseZLifeMock("payments", env),
      notifications: shouldUseZLifeMock("notifications", env),
    },
  } as const;
}
