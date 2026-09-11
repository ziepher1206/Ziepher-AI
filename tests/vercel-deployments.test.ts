import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  classifyVercelDeployment,
  findVercelDeploymentByZiepherId
} from "../lib/deployment/vercel-deployments";

afterEach(() => {
  vi.unstubAllGlobals();
});

const target = { projectId: "prj_ABC123", orgId: "team_123" };

function deployment(overrides: Record<string, unknown> = {}) {
  return {
    uid: "dpl_123",
    projectId: "prj_ABC123",
    url: "example.vercel.app",
    readyState: "READY",
    target: null,
    meta: {
      ziepherDeploymentId: "11111111-1111-4111-8111-111111111111",
      ziepherProjectId: "22222222-2222-4222-8222-222222222222",
      ziepherEnvironment: "preview"
    },
    ...overrides
  };
}

describe("Vercel deployment reconciliation", () => {
  it("finds the exact metadata-bound deployment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        expect(url.searchParams.get("projectId")).toBe("prj_ABC123");
        expect(url.searchParams.get("teamId")).toBe("team_123");
        return new Response(JSON.stringify({ deployments: [deployment()] }), {
          status: 200
        });
      })
    );

    await expect(
      findVercelDeploymentByZiepherId(
        "token",
        target,
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "preview"
      )
    ).resolves.toEqual({
      id: "dpl_123",
      state: "READY",
      url: "https://example.vercel.app",
      target: null
    });
  });

  it("returns null before the provider deployment is visible", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ deployments: [] }), { status: 200 }))
    );

    await expect(
      findVercelDeploymentByZiepherId(
        "token",
        target,
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "preview"
      )
    ).resolves.toBeNull();
  });

  it("fails closed when duplicate provider identities exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ deployments: [deployment(), deployment({ uid: "dpl_456" })] }), {
          status: 200
        })
      )
    );

    await expect(
      findVercelDeploymentByZiepherId(
        "token",
        target,
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "preview"
      )
    ).rejects.toThrow("Multiple Vercel deployments");
  });

  it("fails closed on mismatched project metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            deployments: [
              deployment({
                meta: {
                  ziepherDeploymentId: "11111111-1111-4111-8111-111111111111",
                  ziepherProjectId: "wrong-project",
                  ziepherEnvironment: "preview"
                }
              })
            ]
          }),
          { status: 200 }
        )
      )
    );

    await expect(
      findVercelDeploymentByZiepherId(
        "token",
        target,
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "preview"
      )
    ).rejects.toThrow("does not match the Ziepher project");
  });

  it("classifies terminal and in-progress provider states", () => {
    expect(
      classifyVercelDeployment({ id: "dpl_1", state: "READY", url: null, target: null })
    ).toBe("ready");
    expect(
      classifyVercelDeployment({ id: "dpl_2", state: "BUILDING", url: null, target: null })
    ).toBe("pending");
    expect(
      classifyVercelDeployment({ id: "dpl_3", state: "ERROR", url: null, target: null })
    ).toBe("failed");
  });
});
