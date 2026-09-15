import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const REPOSITORY = "ziepher1206/Ziepher-AI";

type GitHubPull = {
  number: number;
  html_url: string;
  state: string;
  title: string;
  merged_at: string | null;
  draft: boolean;
};

type GitHubIssue = {
  number: number;
  html_url: string;
  state: string;
  title: string;
  pull_request?: unknown;
};

export async function POST() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server-side contributor sync is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const admin = createAdminClient();
  const { data: contributor, error: contributorError } = await admin
    .from("community_contributors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (contributorError || !contributor) {
    return NextResponse.json({ error: "Contributor identity not found." }, { status: 404 });
  }

  const { data: contribution, error: contributionError } = await admin
    .from("contribution_events")
    .select("id, status, metadata")
    .eq("contributor_id", contributor.id)
    .eq("repository", REPOSITORY)
    .eq("contribution_type", "task_claim")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (contributionError || !contribution) {
    return NextResponse.json({ error: "No contribution found to refresh." }, { status: 404 });
  }

  if (contribution.status === "verified" || contribution.status === "rejected" || contribution.status === "superseded") {
    return NextResponse.json({ state: contribution.status, locked: true });
  }

  const metadata = contribution.metadata && typeof contribution.metadata === "object" && !Array.isArray(contribution.metadata)
    ? contribution.metadata as Record<string, unknown>
    : {};
  const kind = metadata.evidence_kind;
  const evidenceNumber = metadata.evidence_number;
  if ((kind !== "pull_request" && kind !== "issue") || typeof evidenceNumber !== "number") {
    return NextResponse.json({ error: "No verified GitHub evidence is attached yet." }, { status: 409 });
  }

  const endpoint = kind === "pull_request"
    ? `https://api.github.com/repos/${REPOSITORY}/pulls/${evidenceNumber}`
    : `https://api.github.com/repos/${REPOSITORY}/issues/${evidenceNumber}`;
  const response = await fetch(endpoint, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!response.ok) {
    return NextResponse.json({ error: "GitHub evidence could not be refreshed." }, { status: 502 });
  }

  let evidenceState = "open";
  let title = "";
  let url = "";
  let reviewReady = false;

  if (kind === "pull_request") {
    const data = await response.json() as GitHubPull;
    evidenceState = data.merged_at ? "merged" : data.state === "closed" ? "closed" : data.draft ? "draft" : "open";
    title = data.title;
    url = data.html_url;
    reviewReady = Boolean(data.merged_at);
  } else {
    const data = await response.json() as GitHubIssue;
    if (data.pull_request) {
      return NextResponse.json({ error: "Stored evidence type no longer matches GitHub." }, { status: 409 });
    }
    evidenceState = data.state;
    title = data.title;
    url = data.html_url;
    reviewReady = data.state === "closed";
  }

  const now = new Date().toISOString();
  const currentClaimState = typeof metadata.claim_state === "string" ? metadata.claim_state : "submitted";
  const nextClaimState = reviewReady && (currentClaimState === "submitted" || currentClaimState === "claimed")
    ? "under_review"
    : currentClaimState;

  const { data: updated, error: updateError } = await admin
    .from("contribution_events")
    .update({
      metadata: {
        ...metadata,
        claim_state: nextClaimState,
        evidence_state: evidenceState,
        evidence_title: title,
        evidence_url: url,
        evidence_checked_at: now,
        review_ready: reviewReady,
      },
      updated_at: now,
    })
    .eq("id", contribution.id)
    .select("id, status, metadata, updated_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Could not save refreshed evidence status." }, { status: 500 });
  }

  return NextResponse.json({
    contribution: updated,
    evidence: { kind, number: evidenceNumber, state: evidenceState, title, url, reviewReady },
    state: nextClaimState,
  });
}
