import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ensureApprovedGitHubPullRequestMerged } from "../lib/source-control/pull-request";

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
const mergeSha = "b".repeat(40);
const input = {
  pullRequestNumber: 17,
  workingBranch: "ziepher/project/run",
  baseBranch: "main",
  expectedHeadSha: headSha
};

function pullRequest(overrides: Record<string, unknown> = {}) {
  return {
    number: 17,
    html_url: "https://github.com/owner/repo/pull/17",
    state: "open",
    merged: false,
    merge_commit_sha: null,
    head: { sha: headSha, ref: "ziepher/project/run" },
    base: { ref: "main" },
    ...overrides
  };
}

describe("approved GitHub pull request merge", () => {
  it("reconciles an already merged exact pull request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        pullRequest({
          state: "closed",
          merged: true,
          merge_commit_sha: mergeSha
        })
      )
    );

    await expect(
      ensureApprovedGitHubPullRequestMerged("token", "owner/repo", input)
    ).resolves.toEqual({ mergeSha, reconciled: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("merges only the approved head SHA with squash", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(pullRequest()))
      .mockResolvedValueOnce(
        jsonResponse({ sha: mergeSha, merged: true, message: "merged" })
      );

    await expect(
      ensureApprovedGitHubPullRequestMerged("token", "owner/repo", input)
    ).resolves.toEqual({ mergeSha, reconciled: false });

    const [, options] = fetchSpy.mock.calls[1]!;
    expect(options?.method).toBe("PUT");
    expect(JSON.parse(String(options?.body))).toEqual({
      sha: headSha,
      merge_method: "squash"
    });
  });

  it("reconciles when GitHub accepted merge but the response was lost", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(pullRequest()))
      .mockResolvedValueOnce(jsonResponse({ message: "gateway timeout" }, 504))
      .mockResolvedValueOnce(
        jsonResponse(
          pullRequest({
            state: "closed",
            merged: true,
            merge_commit_sha: mergeSha
          })
        )
      );

    await expect(
      ensureApprovedGitHubPullRequestMerged("token", "owner/repo", input)
    ).resolves.toEqual({ mergeSha, reconciled: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("fails closed when the pull request closed without merging", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(pullRequest({ state: "closed", merged: false }))
    );

    await expect(
      ensureApprovedGitHubPullRequestMerged("token", "owner/repo", input)
    ).rejects.toThrow("closed without being merged");
  });
});
