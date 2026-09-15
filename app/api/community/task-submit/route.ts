import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const REPOSITORY = "ziepher1206/Ziepher-AI";
const EVIDENCE_PATTERN = /^https:\/\/github\.com\/ziepher1206\/Ziepher-AI\/(pull|issues)\/(\d+)(?:[/?#].*)?$/i;

type GitHubEvidence = {
  number: number;
  html_url: string;
  state: string;
  title: string;
  merged_at?: string | null;
  pull_request?: unknown;
};

async function verifyEvidence(rawUrl: string) {
  const match = rawUrl.match(EVIDENCE_PATTERN);
  if (!match) return null;

  const kind = match[1].toLowerCase() === "pull" ? "pull_request" : "issue";
  const number = Number(match[2]);
  if (!Number.isSafeInteger(number) || number < 1) return null;

  const endpoint = kind === "pull_request"
    ? `https://api.github.com/repos/${REPOSITORY}/pulls/${number}`
    : `https://api.github.com/repos/${REPOSITORY}/issues/${number}`;

  const response = await fetch(endpoint, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data = await response.json() as GitHubEvidence;
  if (kind === "issue" && data.pull_request) return null;

  return {
    kind,
    number: data.number,
    url: data.html_url,
    title: data.title,
    state: data.merged_at ? "merged" : data.state,
  };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server-side contributor sync is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { evidenceUrl?: unknown } | null;
  const evidenceUrl = typeof body?.evidenceUrl === "string" ? body.evidenceUrl.trim().slice(0, 300) : "";
  if (!evidenceUrl) {
    return NextResponse.json({ error: "A GitHub pull request or issue link is required." }, { status: 400 });
  }

  const evidence = await verifyEvidence(evidenceUrl);
  if (!evidence) {
    return NextResponse.json({ error: "Use a real Ziepher-AI GitHub pull request or issue link." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: contributor, error: contributorError } = await admin
    .from("community_contributors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (contributorError || !contributor) {
    return NextResponse.json({ error: "Contributor identity not found." }, { status: 404 });
  }

  const { data: claim, error: claimError } = await admin
    .from("contribution_events")
    .select("id, metadata")
    .eq("contributor_id", contributor.id)
    .eq("repository", REPOSITORY)
    .eq("contribution_type", "task_claim")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (claimError || !claim) {
    return NextResponse.json({ error: "No active task claim found." }, { status: 404 });
  }

  const currentMetadata = claim.metadata && typeof claim.metadata === "object" && !Array.isArray(claim.metadata)
    ? claim.metadata as Record<string, unknown>
    : {};
  const workflowState = currentMetadata.claim_state;
  if (workflowState === "under_review") {
    return NextResponse.json({ state: workflowState });
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    metadata: {
      ...currentMetadata,
      claim_state: "submitted",
      submitted_at: now,
      evidence_kind: evidence.kind,
      evidence_number: evidence.number,
      evidence_url: evidence.url,
      evidence_title: evidence.title,
      evidence_state: evidence.state,
      evidence_checked_at: now,
    },
    updated_at: now,
  };

  if (evidence.kind === "pull_request") {
    updatePayload.github_pr_id = evidence.number;
  }

  const { data: updated, error: updateError } = await admin
    .from("contribution_events")
    .update(updatePayload)
    .eq("id", claim.id)
    .select("id, metadata, status, github_pr_id, updated_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Could not record submission evidence." }, { status: 500 });
  }

  return NextResponse.json({ contribution: updated, evidence });
}
