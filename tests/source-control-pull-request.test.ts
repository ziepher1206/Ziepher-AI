import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ensureGitHubPullRequest } from "../lib/source-control/pull-request";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const expectedHeadSha = "a".repeat(40);
const input = {
  workingBranch: "ziepher/project/build",
  baseBranch: "main",
  expectedHeadSha,
  runId: "11111111-1111-1111-1111-111111111111",
  buildJobId: "22222222-2222-2222-2222-222222222222"
};

function pullRequest(number = 17, headSha = expectedHeadSha, base = "main") {
  return {
    number,
    html_url: `https://github.com/owner/repo/pull/${number}`,
    head: { sha: headSha, ref: input.workingBranch },
    base: { ref: base }
  };
}

describe("retry-safe GitHub pull request creation", () => {
  it("reuses the exact existing open pull request without posting", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([pullRequest()]));

    await expect(
      ensureGitHubPullRequest("token", "owner/repo", input)
    ).resolves.toEqual({
      number: 17,
      url: "https://github.com/owner/repo/pull/17",
      headSha: expectedHeadSha,
      created: false
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]![0])).toContain("state=open");
    expect(String(fetchSpy.mock.calls[0]![0])).toContain("head=owner%3Aziepher%2Fproject%2Fbuild");
  });

  it("creates a new pull request when none exists", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(pullRequest(18)));

    await expect(
      ensureGitHubPullRequest("token", "owner/repo", input)
    ).resolves.toEqual({
      number: 18,
      url: "https://github.com/owner/repo/pull/18",
      headSha: expectedHeadSha,
      created: true
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [, options] = fetchSpy.mock.calls[1]!;
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toEqual({
      head: input.workingBranch,
      base: input.baseBranch,
      title: `Ziepher build ${input.buildJobId}`,
      body: [
        "Generated and validated by Ziepher.",
        "",
        `Ziepher-Source-Control-Run: ${input.runId}`,
        `Ziepher-Head-SHA: ${expectedHeadSha}`
      ].join("\n"),
      draft: false
    });
  });

  it("reconciles a pull request created despite a lost provider response", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ message: "lost response" }, 500))
      .mockResolvedValueOnce(jsonResponse([pullRequest(19)]));

    await expect(
      ensureGitHubPullRequest("token", "owner/repo", input)
    ).resolves.toEqual({
      number: 19,
      url: "https://github.com/owner/repo/pull/19",
      headSha: expectedHeadSha,
      created: false
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("fails closed when the existing pull request head changed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([pullRequest(20, "b".repeat(40))])
    );

    await expect(
      ensureGitHubPullRequest("token", "owner/repo", input)
    ).rejects.toThrow("head changed unexpectedly");
  });

  it("fails closed when the working branch targets another base", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([pullRequest(21, expectedHeadSha, "develop")])
    );

    await expect(
      ensureGitHubPullRequest("token", "owner/repo", input)
    ).rejects.toThrow("unexpected base branch");
  });

  it("fails closed when multiple open pull requests exist for the working branch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([pullRequest(22), pullRequest(23)])
    );

    await expect(
      ensureGitHubPullRequest("token", "owner/repo", input)
    ).rejects.toThrow("Multiple open pull requests");
  });
});
