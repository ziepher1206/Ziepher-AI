import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculateVerifiedContributionScore,
  type VerifiedContributionFactors,
} from "@/lib/community/verified-score";

export type ReviewerContributionFactors = Pick<
  VerifiedContributionFactors,
  | "quality"
  | "originality"
  | "reliability"
  | "documentationValue"
  | "reviewEffort"
  | "moduleImportance"
  | "ongoingResponsibility"
  | "securityImportance"
>;

function assertStudioTaskReadyForReview(event: {
  contribution_type: string;
  metadata: unknown;
  github_pr_id: number | null;
  github_issue_id: number | null;
}) {
  if (event.contribution_type !== "task_claim") return;

  const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
    ? event.metadata as Record<string, unknown>
    : {};
  const claimState = metadata.claim_state;
  const evidenceKind = metadata.evidence_kind;
  const evidenceNumber = metadata.evidence_number;
  const evidenceUrl = metadata.evidence_url;
  const reviewReady = metadata.review_ready;

  if (claimState !== "under_review" || reviewReady !== true) {
    throw new Error("Studio task must be under review with review-ready evidence before it can be resolved.");
  }
  if ((evidenceKind !== "pull_request" && evidenceKind !== "issue") || typeof evidenceNumber !== "number" || typeof evidenceUrl !== "string") {
    throw new Error("Studio task is missing verified GitHub evidence.");
  }
  if (evidenceKind === "pull_request" && event.github_pr_id !== evidenceNumber) {
    throw new Error("Studio task pull request evidence does not match the ledger record.");
  }
  if (evidenceKind === "issue" && event.github_issue_id !== evidenceNumber) {
    throw new Error("Studio task issue evidence does not match the ledger record.");
  }
}

export async function verifyContributionEvent(input: {
  eventId: string;
  verifierContributorId: string;
  reason: string;
  factors: ReviewerContributionFactors;
}) {
  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("contribution_events")
    .select("id, contributor_id, status, contribution_type, metadata, github_pr_id, github_issue_id, impact_score, difficulty_score, scope_score, maintenance_score")
    .eq("id", input.eventId)
    .single();

  if (eventError) throw eventError;
  if (event.status !== "pending") {
    throw new Error("Only pending contribution events can be verified through this workflow.");
  }
  if (event.contributor_id === input.verifierContributorId) {
    throw new Error("Contributors cannot verify their own contribution events.");
  }
  assertStudioTaskReadyForReview(event);

  const scoring = calculateVerifiedContributionScore({
    impact: event.impact_score,
    difficulty: event.difficulty_score,
    scope: event.scope_score,
    maintenanceValue: event.maintenance_score,
    ...input.factors,
  });

  const { data, error } = await supabase.rpc("verify_contribution_event", {
    p_event_id: input.eventId,
    p_verifier_contributor_id: input.verifierContributorId,
    p_verified_score: scoring.verifiedScore,
    p_scoring_breakdown: scoring.scoringBreakdown,
    p_reason: input.reason,
  });

  if (error) throw error;
  return data;
}

export async function rejectContributionEvent(input: {
  eventId: string;
  verifierContributorId: string;
  reason: string;
}) {
  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("contribution_events")
    .select("id, contributor_id, status, contribution_type, metadata, github_pr_id, github_issue_id")
    .eq("id", input.eventId)
    .single();

  if (eventError) throw eventError;
  if (event.status !== "pending") {
    throw new Error("Only pending contribution events can be rejected through this workflow.");
  }
  if (event.contributor_id === input.verifierContributorId) {
    throw new Error("Contributors cannot reject their own contribution events.");
  }
  assertStudioTaskReadyForReview(event);

  const { data, error } = await supabase.rpc("reject_contribution_event", {
    p_event_id: input.eventId,
    p_verifier_contributor_id: input.verifierContributorId,
    p_reason: input.reason,
  });

  if (error) throw error;
  return data;
}
