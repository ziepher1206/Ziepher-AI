import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { verifyGitHubPullRequest } from "../lib/source-control/pull-request";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const headSha = "a".repeat(40);
const input = {
  pullRequestNumber: 27,
  workingBranch: "ziepher/project/build",
  baseBranch: "main",
  expectedHeadSha: headSha
};

function pr(overrides: Record<string, unknown> = {}) {
  return {
    number: 27,
    html_url: "https://github.com/owner/repo/pull/27",
    state: "open",
    head: { sha: headSha, ref: input.workingBranch },
    base: { ref: input.baseBranch },
    ...overrides
  };
}

describe("pull request identity verification", () => {
  it("accepts only the recorded open PR/base/head identity", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(pr()));

    await expect(
      verifyGitHubPullRequest("token", "owner/repo", input)
    ).resolves.toEqual({
      number: 27,
      url: "https://github.com/owner/repo/pull/27",
      headSha
    });
    expect(String(fetchSpy.mock.calls[0]![0])).toContain("/pulls/27");
  });

  it("rejects a closed pull request", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(pr({ state: "closed" }))
    );
    await expect(
      verifyGitHubPullRequest("token", "owner/repo", input)
    ).rejects.toThrow("no longer open");
  });

  it("rejects a changed head before trusting check results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(
        pr({ head: { sha: "b".repeat(40), ref: input.workingBranch } })
      )
    );
    await expect(
      verifyGitHubPullRequest("token", "owner/repo", input)
    ).rejects.toThrow("head changed unexpectedly");
  });
});
