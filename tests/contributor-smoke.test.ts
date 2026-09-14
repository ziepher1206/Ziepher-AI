import { describe, expect, it } from "vitest";

import { validateContributorSmoke } from "../lib/community/contributor-smoke";

const safeEnv = {
  ZLIFE_DEV_MODE: "true",
  ZLIFE_MOCK_AI: "true",
  ZLIFE_MOCK_EMAIL: "true",
  ZLIFE_MOCK_SMS: "true",
  ZLIFE_MOCK_PAYMENTS: "true",
  ZLIFE_MOCK_NOTIFICATIONS: "true",
  SUPABASE_SERVICE_ROLE_KEY: "",
  GITHUB_COMMUNITY_WEBHOOK_SECRET: "",
  ZIEPHER_PROVIDER_CREDENTIALS_KEY: "",
  GITHUB_OAUTH_CLIENT_SECRET: "",
  OPENAI_API_KEY: "",
  GOOGLE_AI_API_KEY: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
};

const scripts = {
  typecheck: "tsc --noEmit",
  lint: "eslint .",
  test: "vitest run",
  build: "next build",
};

describe("contributor zero-cost smoke validation", () => {
  it("accepts the default mocked contributor path without provider secrets", () => {
    const result = validateContributorSmoke({ env: safeEnv, scripts, nodeVersion: "22.16.0" });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(Object.values(result.state.mocks).every(Boolean)).toBe(true);
  });

  it("fails closed when a paid provider could be used", () => {
    const result = validateContributorSmoke({
      env: { ...safeEnv, OPENAI_API_KEY: "development-key", ZLIFE_MOCK_AI: "false" },
      scripts,
      nodeVersion: "22.16.0",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("ZLIFE_MOCK_AI must be true for the default contributor smoke path.");
    expect(result.errors).toContain("OPENAI_API_KEY must stay blank in the zero-cost contributor smoke environment.");
  });

  it("rejects unsupported Node versions and incomplete validation scripts", () => {
    const result = validateContributorSmoke({
      env: safeEnv,
      scripts: { ...scripts, build: "" },
      nodeVersion: "20.19.0",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Node 20.19.0 is unsupported; use Node 22.16.0 or newer.");
    expect(result.errors).toContain("package.json is missing the required build script.");
  });
});
