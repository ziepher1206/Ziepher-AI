import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildPendingContributionDraft,
  type MergedPullRequestEvidence,
} from "@/lib/community/github-contribution";

async function getOrCreateContributor(githubLogin: string) {
  const supabase = createAdminClient();
  const normalizedLogin = githubLogin.trim();

  const { data: existing, error: lookupError } = await supabase
    .from("community_contributors")
    .select("id, status")
    .ilike("github_login", normalizedLogin)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("community_contributors")
    .insert({
      github_login: normalizedLogin,
      status: "contributor",
      is_verified: false,
    })
    .select("id, status")
    .single();

  if (!createError && created) return created;

  // A duplicate can occur if two webhook deliveries for a contributor race.
  // Re-read the unique GitHub identity before surfacing the insert error.
  const { data: raced, error: raceLookupError } = await supabase
    .from("community_contributors")
    .select("id, status")
    .ilike("github_login", normalizedLogin)
    .maybeSingle();

  if (raceLookupError) throw raceLookupError;
  if (raced) return raced;
  throw createError ?? new Error("Unable to create community contributor.");
}

export async function recordMergedPullRequestContribution(evidence: MergedPullRequestEvidence) {
  const contributor = await getOrCreateContributor(evidence.authorLogin);
  const draft = buildPendingContributionDraft(evidence);
  const supabase = createAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("contribution_events")
    .select("id, status, verified_score")
    .eq("repository", draft.repository)
    .eq("github_pr_id", draft.githubPrId)
    .eq("contributor_id", contributor.id)
    .neq("status", "superseded")
    .maybeSingle();

  if (existingError) throw existingError;

  // Webhook redelivery is idempotent. Never rewrite a verified/rejected event
  // from untrusted GitHub delivery data.
  if (existing) {
    return {
      contributionEventId: existing.id as string,
      status: existing.status as string,
      created: false,
    };
  }

  const { data: created, error: insertError } = await supabase
    .from("contribution_events")
    .insert({
      contributor_id: contributor.id,
      source: draft.source,
      repository: draft.repository,
      module_id: draft.moduleId,
      contribution_type: draft.contributionType,
      github_pr_id: draft.githubPrId,
      description: draft.description,
      impact_score: draft.impactScore,
      difficulty_score: draft.difficultyScore,
      scope_score: draft.scopeScore,
      maintenance_score: draft.maintenanceScore,
      quality_score: draft.qualityScore,
      verified_score: null,
      status: "pending",
      metadata: draft.metadata,
    })
    .select("id, status")
    .single();

  if (insertError) throw insertError;

  return {
    contributionEventId: created.id as string,
    status: created.status as string,
    created: true,
  };
}
