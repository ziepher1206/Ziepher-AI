import { describe, expect, it } from "vitest";
import { createOAuthState, oauthStateMatches } from "../lib/provider-connections/oauth-state";

describe("OAuth state protection", () => {
  it("creates unpredictable state values and accepts an exact match", () => {
    const first = createOAuthState();
    const second = createOAuthState();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(oauthStateMatches(first, first)).toBe(true);
  });

  it("rejects missing, different, and differently sized state values", () => {
    expect(oauthStateMatches(undefined, "state")).toBe(false);
    expect(oauthStateMatches("state", null)).toBe(false);
    expect(oauthStateMatches("state-a", "state-b")).toBe(false);
    expect(oauthStateMatches("short", "much-longer")).toBe(false);
  });
});
