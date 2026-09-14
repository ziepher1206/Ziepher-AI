import { getZLifeDevModeState } from "./dev-mode";

export const CONTRIBUTOR_MOCK_FLAGS = [
  "ZLIFE_MOCK_AI",
  "ZLIFE_MOCK_EMAIL",
  "ZLIFE_MOCK_SMS",
  "ZLIFE_MOCK_PAYMENTS",
  "ZLIFE_MOCK_NOTIFICATIONS",
] as const;

export const PRODUCTION_SECRET_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GITHUB_COMMUNITY_WEBHOOK_SECRET",
  "ZIEPHER_PROVIDER_CREDENTIALS_KEY",
  "GITHUB_OAUTH_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

const REQUIRED_SCRIPTS = ["typecheck", "lint", "test", "build"] as const;

type EnvLike = Readonly<Record<string, string | undefined>>;
type ScriptsLike = Readonly<Record<string, string | undefined>>;

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function parseVersion(value: string) {
  const [major = 0, minor = 0, patch = 0] = value.split(".").map((part) => Number.parseInt(part, 10) || 0);
  return { major, minor, patch };
}

function supportsRequiredNode(value: string) {
  const version = parseVersion(value);
  if (version.major !== 22) return version.major > 22;
  if (version.minor !== 16) return version.minor > 16;
  return version.patch >= 0;
}

export function validateContributorSmoke(input: {
  env: EnvLike;
  scripts: ScriptsLike;
  nodeVersion: string;
}) {
  const errors: string[] = [];
  const state = getZLifeDevModeState(input.env);

  if (!supportsRequiredNode(input.nodeVersion)) {
    errors.push(`Node ${input.nodeVersion} is unsupported; use Node 22.16.0 or newer.`);
  }

  if (!state.enabled) {
    errors.push("ZLIFE_DEV_MODE must be true for the zero-cost contributor path.");
  }

  for (const flag of CONTRIBUTOR_MOCK_FLAGS) {
    if (input.env[flag]?.trim().toLowerCase() !== "true") {
      errors.push(`${flag} must be true for the default contributor smoke path.`);
    }
  }

  for (const key of PRODUCTION_SECRET_KEYS) {
    if (hasValue(input.env[key])) {
      errors.push(`${key} must stay blank in the zero-cost contributor smoke environment.`);
    }
  }

  for (const script of REQUIRED_SCRIPTS) {
    if (!hasValue(input.scripts[script])) {
      errors.push(`package.json is missing the required ${script} script.`);
    }
  }

  if (!Object.values(state.mocks).every(Boolean)) {
    errors.push("All provider mocks must resolve to enabled behind ZLIFE_DEV_MODE.");
  }

  return {
    ok: errors.length === 0,
    errors,
    state,
  } as const;
}
