import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../lib/provider-connections/store", () => ({
  getProviderConnection: vi.fn(),
  upsertProviderConnection: vi.fn()
}));

import { validateVercelConnection } from "../lib/provider-connections/vercel";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Vercel workspace connection validation", () => {
  it("validates a team-scoped token without exposing the token", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/v5/user/tokens/current")) {
        return new Response(
          JSON.stringify({ token: { scopes: [{ type: "user" }, { type: "team" }] } }),
          { status: 200 }
        );
      }
      if (url.endsWith("/v2/teams/team_example123")) {
        return new Response(
          JSON.stringify({
            id: "team_example123",
            slug: "example-team",
            name: "Example Team"
          }),
          { status: 200 }
        );
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      validateVercelConnection("secret-token", "team_example123")
    ).resolves.toEqual({
      accountId: "team_example123",
      teamId: "team_example123",
      displayName: "Example Team",
      scopes: ["user", "team"]
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("validates a personal Vercel account when no team is supplied", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.endsWith("/v5/user/tokens/current")) {
          return new Response(JSON.stringify({ token: { scopes: [] } }), {
            status: 200
          });
        }
        if (url.endsWith("/v2/user")) {
          return new Response(
            JSON.stringify({
              user: {
                id: "user_123",
                username: "builder",
                name: "Builder Account"
              }
            }),
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      })
    );

    await expect(validateVercelConnection("secret-token")).resolves.toEqual({
      accountId: "user_123",
      teamId: null,
      displayName: "Builder Account",
      scopes: []
    });
  });

  it("rejects malformed team IDs before contacting the team endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ token: { scopes: [] } }), { status: 200 })
      )
    );

    await expect(
      validateVercelConnection("secret-token", "not-a-team")
    ).rejects.toThrow("team_");
  });
});
