import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getVercelProjectTarget } from "../lib/deployment/vercel-projects";

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
});
