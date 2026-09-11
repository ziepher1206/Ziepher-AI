import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ensureGitHubBranchAtBase } from "../lib/source-control/github";

const baseSha = "a".repeat(40);
const otherSha = "b".repeat(40);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("retry-safe GitHub branch creation", () => {
  it("creates a missing working branch at the exact base SHA", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: baseSha } }))
      .mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, 404))
      .mockResolvedValueOnce(jsonResponse({ ref: "refs/heads/ziepher/test/run" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ensureGitHubBranchAtBase(
        "token",
        "ziepher1206/example",
        "main",
        "ziepher/test/run"
      )
    ).resolves.toEqual({ baseSha, created: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reconciles a retry when the branch already exists at the base SHA", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: baseSha } }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: baseSha } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ensureGitHubBranchAtBase(
        "token",
        "ziepher1206/example",
        "main",
        "ziepher/test/run"
      )
    ).resolves.toEqual({ baseSha, created: false });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refuses to overwrite a working branch at an unexpected SHA", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: baseSha } }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: otherSha } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ensureGitHubBranchAtBase(
        "token",
        "ziepher1206/example",
        "main",
        "ziepher/test/run"
      )
    ).rejects.toThrow(/refusing to overwrite/i);
  });

  it("reconciles a concurrent branch-create race only when SHA matches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: baseSha } }))
      .mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, 404))
      .mockResolvedValueOnce(jsonResponse({ message: "Reference already exists" }, 422))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: baseSha } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ensureGitHubBranchAtBase(
        "token",
        "ziepher1206/example",
        "main",
        "ziepher/test/run"
      )
    ).resolves.toEqual({ baseSha, created: false });
  });
});
