import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getGitHubCheckSummary,
  mergeApprovedGitHubPullRequest,
  putGitHubFile
} from "../lib/source-control/github";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("GitHub source-control adapter", () => {
  it("rejects unsafe repository paths before calling GitHub", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      putGitHubFile("token", "owner/repo", "branch", "../secret", "x", "message")
    ).rejects.toThrow("Unsafe repository file path");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires explicit approval before merge", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      mergeApprovedGitHubPullRequest("token", "owner/repo", {
        pullRequestNumber: 1,
        expectedHeadSha: "a".repeat(40),
        stage: "preview_ready"
      })
    ).rejects.toThrow("approved source-control run");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("binds merge to the expected head SHA", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ sha: "b".repeat(40), merged: true, message: "merged" })
    );

    const result = await mergeApprovedGitHubPullRequest("token", "owner/repo", {
      pullRequestNumber: 7,
      expectedHeadSha: "a".repeat(40),
      stage: "approved"
    });

    expect(result.mergeSha).toBe("b".repeat(40));
    const [, options] = fetchSpy.mock.calls[0]!;
    expect(JSON.parse(String(options?.body))).toMatchObject({
      sha: "a".repeat(40),
      merge_method: "squash"
    });
  });

  it("fails closed when there are no check runs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ check_runs: [] }));
    await expect(
      getGitHubCheckSummary("token", "owner/repo", "a".repeat(40))
    ).resolves.toEqual({ total: 0, pending: 0, failed: 0, passed: false });
  });

  it("only passes completed successful checks", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        check_runs: [
          { name: "CI", status: "completed", conclusion: "success" },
          { name: "Preview", status: "completed", conclusion: "neutral" }
        ]
      })
    );
    await expect(
      getGitHubCheckSummary("token", "owner/repo", "a".repeat(40))
    ).resolves.toMatchObject({ total: 2, pending: 0, failed: 0, passed: true });
  });
});
