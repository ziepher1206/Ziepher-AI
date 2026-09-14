import { NextResponse } from "next/server";

import { recordMergedPullRequestContribution } from "@/lib/community/contribution-ledger";
import {
  parseMergedPullRequestEvidence,
  verifyGitHubWebhookSignature,
} from "@/lib/community/github-webhook";

export const runtime = "nodejs";

function allowedRepositories() {
  return new Set(
    (process.env.GITHUB_COMMUNITY_ALLOWED_REPOSITORIES ?? "")
      .split(",")
      .map((repository) => repository.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_COMMUNITY_WEBHOOK_SECRET;
  const repositories = allowedRepositories();

  // The endpoint intentionally does nothing until a maintainer configures both
  // the signing secret and explicit repository allowlist in a trusted runtime.
  if (!secret || repositories.size === 0) {
    return NextResponse.json({ error: "Community webhook is not configured." }, { status: 503 });
  }

  if (request.headers.get("x-github-event") !== "pull_request") {
    return NextResponse.json({ ignored: true }, { status: 202 });
  }

  const rawBody = await request.text();
  if (!verifyGitHubWebhookSignature(secret, rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const evidence = parseMergedPullRequestEvidence(payload);
  if (!evidence) {
    return NextResponse.json({ ignored: true }, { status: 202 });
  }

  if (!repositories.has(evidence.repository.toLowerCase())) {
    return NextResponse.json({ error: "Repository is not allowed." }, { status: 403 });
  }

  const result = await recordMergedPullRequestContribution(evidence);
  return NextResponse.json({
    accepted: true,
    status: result.status,
    created: result.created,
    contribution_event_id: result.contributionEventId,
  });
}
