import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildPendingContributionDraft } from "../lib/community/github-contribution";
import {
  parseMergedPullRequestEvidence,
  verifyGitHubWebhookSignature,
} from "../lib/community/github-webhook";

const evidence = {
  repository: "ziepher1206/Ziepher-AI",
  prNumber: 120,
  authorLogin: "example-contributor",
  title: "Harden module access",
  body: "Module: tree-service",
  additions: 240,
  deletions: 80,
  changedFiles: 12,
  labels: ["Security", "Advanced", "Tree Service"],
  mergedAt: "2026-09-14T06:00:00Z",
  htmlUrl: "https://github.com/ziepher1206/Ziepher-AI/pull/120",
};

describe("community GitHub contribution ingestion", () => {
  it("verifies GitHub HMAC signatures without accepting malformed signatures", () => {
    const secret = "development-test-secret";
    const rawBody = JSON.stringify({ hello: "world" });
    const signature = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;

    expect(verifyGitHubWebhookSignature(secret, rawBody, signature)).toBe(true);
    expect(verifyGitHubWebhookSignature(secret, rawBody, "sha256=bad")).toBe(false);
    expect(verifyGitHubWebhookSignature("", rawBody, signature)).toBe(false);
  });

  it("accepts only closed, merged pull request payloads", () => {
    const payload = {
      action: "closed",
      number: evidence.prNumber,
      pull_request: {
        merged: true,
        title: evidence.title,
        body: evidence.body,
        additions: evidence.additions,
        deletions: evidence.deletions,
        changed_files: evidence.changedFiles,
        merged_at: evidence.mergedAt,
        html_url: evidence.htmlUrl,
        user: { login: evidence.authorLogin },
        labels: evidence.labels.map((name) => ({ name })),
        base: { repo: { full_name: evidence.repository } },
      },
    };

    expect(parseMergedPullRequestEvidence(payload)).toMatchObject({
      repository: evidence.repository,
      prNumber: evidence.prNumber,
      authorLogin: evidence.authorLogin,
    });

    expect(
      parseMergedPullRequestEvidence({
        ...payload,
        pull_request: { ...payload.pull_request, merged: false },
      }),
    ).toBeNull();
  });

  it("creates only pending preliminary evidence and never auto-awards verified value", () => {
    const draft = buildPendingContributionDraft(evidence);

    expect(draft.moduleId).toBe("tree-service");
    expect(draft.contributionType).toBe("security");
    expect(draft.status).toBe("pending");
    expect(draft.impactScore).toBe(70);
    expect(draft.difficultyScore).toBe(80);
    expect(draft.qualityScore).toBe(0);
    expect(draft.metadata.verified_value_awarded).toBe(false);
    expect(draft.metadata).not.toHaveProperty("commit_count");
  });

  it("caps scope so huge diffs cannot create unbounded contribution value", () => {
    const draft = buildPendingContributionDraft({
      ...evidence,
      additions: 1_000_000,
      deletions: 1_000_000,
      changedFiles: 10_000,
    });

    expect(draft.scopeScore).toBeLessThanOrEqual(80);
    expect(draft.qualityScore).toBe(0);
  });
});
