import "server-only";

import { COMMUNITY_REVIEWER_STATUSES } from "@/lib/community/review-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function linkVerifiedMaintainerGitHubIdentity(input: {
  userId: string;
  githubLogin: string;
}) {
  const admin = createAdminClient();
  const normalizedLogin = input.githubLogin.trim();

  const { data: contributor, error: contributorError } = await admin
    .from("community_contributors")
    .select("id, user_id, github_login, status, is_verified")
    .ilike("github_login", normalizedLogin)
    .maybeSingle();

  if (contributorError) throw contributorError;
  if (!contributor) return { linked: false as const, reason: "not_registered" as const };

  if (!contributor.is_verified || !COMMUNITY_REVIEWER_STATUSES.includes(contributor.status)) {
    return { linked: false as const, reason: "not_verified_maintainer" as const };
  }

  if (contributor.user_id && contributor.user_id !== input.userId) {
    throw new Error("This verified GitHub contributor is already linked to another ZLife account.");
  }

  const { data: conflictingUser, error: conflictingUserError } = await admin
    .from("community_contributors")
    .select("id")
    .eq("user_id", input.userId)
    .neq("id", contributor.id)
    .maybeSingle();

  if (conflictingUserError) throw conflictingUserError;
  if (conflictingUser) {
    throw new Error("This ZLife account is already linked to a different contributor identity.");
  }

  if (contributor.user_id === input.userId) {
    return { linked: true as const, contributorId: contributor.id, alreadyLinked: true as const };
  }

  const { error: updateError } = await admin
    .from("community_contributors")
    .update({ user_id: input.userId, updated_at: new Date().toISOString() })
    .eq("id", contributor.id)
    .is("user_id", null);

  if (updateError) throw updateError;

  const { error: auditError } = await admin.from("contributor_status_events").insert({
    contributor_id: contributor.id,
    previous_status: contributor.status,
    new_status: contributor.status,
    reason: `Identity linked through verified GitHub OAuth for @${normalizedLogin}`,
    changed_by: contributor.id,
  });

  if (auditError) throw auditError;

  return { linked: true as const, contributorId: contributor.id, alreadyLinked: false as const };
}
