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

async function assertIndependentReviewer(eventId: string, verifierContributorId: string) {
  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("contribution_events")
    .select("id, contributor_id")
    .eq("id", eventId)
    .single();

  if (error) throw error;
  if (event.contributor_id === verifierContributorId) {
    throw new Error("Contributors cannot review their own contribution events.");
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
    .select("id, contributor_id, status, impact_score, difficulty_score, scope_score, maintenance_score")
    .eq("id", input.eventId)
    .single();

  if (eventError) throw eventError;
  if (event.contributor_id === input.verifierContributorId) {
    throw new Error("Contributors cannot review their own contribution events.");
  }
  if (event.status !== "pending") {
    throw new Error("Only pending contribution events can be verified through this workflow.");
  }

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
  await assertIndependentReviewer(input.eventId, input.verifierContributorId);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("reject_contribution_event", {
    p_event_id: input.eventId,
    p_verifier_contributor_id: input.verifierContributorId,
    p_reason: input.reason,
  });

  if (error) throw error;
  return data;
}
