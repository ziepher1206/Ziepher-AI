import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getGitHubCheckSummary,
  mergeApprovedGitHubPullRequest,
  publishGitHubFilesAtomically,
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

  it("publishes generated files as one atomic commit", async () => {
    const parent = "a".repeat(40);
    const parentTree = "b".repeat(40);
    const blobOne = "c".repeat(40);
    const blobTwo = "d".repeat(40);
    const sourceTree = "e".repeat(40);
    const sourceCommit = "f".repeat(40);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ object: { sha: parent } }))
      .mockResolvedValueOnce(
        jsonResponse({
          sha: parent,
          message: "base",
          tree: { sha: parentTree },
          parents: []
        })
      )
      .mockResolvedValueOnce(jsonResponse({ sha: blobOne }))
      .mockResolvedValueOnce(jsonResponse({ sha: blobTwo }))
      .mockResolvedValueOnce(jsonResponse({ sha: sourceTree }))
      .mockResolvedValueOnce(jsonResponse({ sha: sourceCommit }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: sourceCommit } }));

    const result = await publishGitHubFilesAtomically("token", "owner/repo", {
      branch: "ziepher/project/build",
      expectedParentSha: parent,
      runId: "11111111-1111-1111-1111-111111111111",
      buildJobId: "22222222-2222-2222-2222-222222222222",
      sourceSha256: "1".repeat(64),
      files: [
        { path: "app/page.tsx", content: "export default function Page() {}" },
        { path: "package.json", content: "{}" }
      ]
    });

    expect(result).toEqual({ commitSha: sourceCommit, reconciled: false });
    const calls = fetchSpy.mock.calls.map(([url, options]) => ({
      url: String(url),
      method: options?.method ?? "GET",
      body: options?.body ? JSON.parse(String(options.body)) : null
    }));
    expect(calls.filter((call) => call.url.endsWith("/git/blobs"))).toHaveLength(2);
    expect(calls.find((call) => call.url.endsWith("/git/trees"))?.body).toMatchObject({
      base_tree: parentTree
    });
    expect(calls.find((call) => call.url.endsWith("/git/commits"))?.body).toMatchObject({
      tree: sourceTree,
      parents: [parent]
    });
    expect(calls.at(-1)).toMatchObject({
      method: "PATCH",
      body: { sha: sourceCommit, force: false }
    });
  });

  it("reconciles an already accepted atomic source commit", async () => {
    const parent = "a".repeat(40);
    const current = "b".repeat(40);
    const message = [
      "Ziepher build 22222222-2222-2222-2222-222222222222",
      "",
      "Ziepher-Source-Control-Run: 11111111-1111-1111-1111-111111111111",
      `Ziepher-Source-SHA256: ${"1".repeat(64)}`
    ].join("\n");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ object: { sha: current } }))
      .mockResolvedValueOnce(
        jsonResponse({
          sha: current,
          message,
          tree: { sha: "c".repeat(40) },
          parents: [{ sha: parent }]
        })
      );

    await expect(
      publishGitHubFilesAtomically("token", "owner/repo", {
        branch: "ziepher/project/build",
        expectedParentSha: parent,
        runId: "11111111-1111-1111-1111-111111111111",
        buildJobId: "22222222-2222-2222-2222-222222222222",
        sourceSha256: "1".repeat(64),
        files: [{ path: "package.json", content: "{}" }]
      })
    ).resolves.toEqual({ commitSha: current, reconciled: true });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("blocks reconciliation when the branch moved to an unrelated commit", async () => {
    const parent = "a".repeat(40);
    const current = "b".repeat(40);
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ object: { sha: current } }))
      .mockResolvedValueOnce(
        jsonResponse({
          sha: current,
          message: "somebody else changed the branch",
          tree: { sha: "c".repeat(40) },
          parents: [{ sha: parent }]
        })
      );

    await expect(
      publishGitHubFilesAtomically("token", "owner/repo", {
        branch: "ziepher/project/build",
        expectedParentSha: parent,
        runId: "11111111-1111-1111-1111-111111111111",
        buildJobId: "22222222-2222-2222-2222-222222222222",
        sourceSha256: "1".repeat(64),
        files: [{ path: "package.json", content: "{}" }]
      })
    ).rejects.toThrow("moved unexpectedly");
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
