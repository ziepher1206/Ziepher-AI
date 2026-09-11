import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getVercelProjectTarget,
  listAccessibleVercelProjects
} from "../lib/deployment/vercel-projects";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Vercel project target lookup", () => {
  it("returns canonical project and account identity", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/v9/projects/my-project");
      expect(url.searchParams.get("teamId")).toBe("team_123");
      return new Response(
        JSON.stringify({
          id: "prj_ABC123",
          name: "my-project",
          accountId: "team_123"
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getVercelProjectTarget("secret-token", "my-project", "team_123")
    ).resolves.toEqual({
      id: "prj_ABC123",
      name: "my-project",
      orgId: "team_123"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("lists only valid projects in the connected team", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/v10/projects");
      expect(url.searchParams.get("teamId")).toBe("team_123");
      expect(url.searchParams.get("limit")).toBe("100");
      return new Response(
        JSON.stringify({
          projects: [
            { id: "prj_ZZZ", name: "zeta", accountId: "team_123" },
            { id: "prj_AAA", name: "alpha", accountId: "team_123" },
            { id: "prj_OTHER", name: "other-team", accountId: "team_other" },
            { id: "bad-id", name: "broken", accountId: "team_123" }
          ]
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listAccessibleVercelProjects("secret-token", "team_123")
    ).resolves.toEqual([
      { id: "prj_AAA", name: "alpha", orgId: "team_123" },
      { id: "prj_ZZZ", name: "zeta", orgId: "team_123" }
    ]);
  });

  it("fails closed when Vercel denies access", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("forbidden", { status: 403 }))
    );

    await expect(
      getVercelProjectTarget("secret-token", "prj_NOPE", null)
    ).rejects.toThrow("Vercel project access was denied");
  });

  it("rejects malformed provider identity", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: "unexpected-project-id",
            name: "my-project",
            accountId: "team_123"
          }),
          { status: 200 }
        )
      )
    );

    await expect(
      getVercelProjectTarget("secret-token", "my-project", null)
    ).rejects.toThrow("unexpected project ID format");
  });

  it("rejects a malformed project list response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ projects: "not-an-array" }), { status: 200 })
      )
    );

    await expect(
      listAccessibleVercelProjects("secret-token", null)
    ).rejects.toThrow("invalid project list");
  });
});
