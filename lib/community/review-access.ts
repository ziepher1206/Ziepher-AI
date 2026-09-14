export const COMMUNITY_REVIEWER_STATUSES = [
  "module_maintainer",
  "core_contributor",
  "core_team",
] as const;

export type CommunityReviewerStatus =
  (typeof COMMUNITY_REVIEWER_STATUSES)[number];

export type CommunityReviewerIdentity = {
  id: string;
  user_id: string | null;
  status: string;
  is_verified: boolean;
};

export function isAuthorizedCommunityReviewer(
  contributor: CommunityReviewerIdentity | null | undefined,
  authenticatedUserId: string,
) {
  if (!contributor) return false;
  if (!contributor.is_verified) return false;
  if (!contributor.user_id || contributor.user_id !== authenticatedUserId) {
    return false;
  }

  return COMMUNITY_REVIEWER_STATUSES.includes(
    contributor.status as CommunityReviewerStatus,
  );
}
