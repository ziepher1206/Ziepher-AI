import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../lib/provider-connections/store", () => ({
  getProviderConnection: vi.fn(),
  markProviderConnectionNeedsAttention: vi.fn(),
  rotateProviderTokens: vi.fn()
}));

import { createGitHubAuthorizationUrl } from "../lib/provider-connections/github-oauth";

describe("GitHub OAuth helper", () => {
  beforeEach(() => {
    process.env.GITHUB_OAUTH_CLIENT_ID = "client-id";
  });
  afterEach(() => {
    delete process.env.GITHUB_OAUTH_CLIENT_ID;
  });

  it("requests offline access for refreshable tokens", () => {
    const url = new URL(
      createGitHubAuthorizationUrl({
        redirectUri: "https://example.com/callback",
        state: "state-token"
      })
    );
    expect(url.searchParams.get("scope")).toContain("offline_access");
    expect(url.searchParams.get("state")).toBe("state-token");
    expect(url.searchParams.get("redirect_uri")).toBe("https://example.com/callback");
  });
});
