import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import type { MergedPullRequestEvidence } from "@/lib/community/github-contribution";

const mergedPullRequestSchema = z.object({
  action: z.literal("closed"),
  number: z.number().int().positive(),
  pull_request: z.object({
    merged: z.literal(true),
    title: z.string().min(1),
    body: z.string().nullable().optional(),
    additions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    changed_files: z.number().int().nonnegative(),
    merged_at: z.string().min(1),
    html_url: z.string().url().nullable().optional(),
    user: z.object({ login: z.string().min(1) }),
    labels: z.array(z.object({ name: z.string() })).default([]),
    base: z.object({
      repo: z.object({ full_name: z.string().min(3) }),
    }),
  }),
});

export function verifyGitHubWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
) {
  if (!secret || !signatureHeader?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const receivedBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function parseMergedPullRequestEvidence(payload: unknown): MergedPullRequestEvidence | null {
  const parsed = mergedPullRequestSchema.safeParse(payload);
  if (!parsed.success) return null;

  const pr = parsed.data.pull_request;
  return {
    repository: pr.base.repo.full_name,
    prNumber: parsed.data.number,
    authorLogin: pr.user.login,
    title: pr.title,
    body: pr.body,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    labels: pr.labels.map((label) => label.name),
    mergedAt: pr.merged_at,
    htmlUrl: pr.html_url,
  };
}
