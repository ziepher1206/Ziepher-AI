import "server-only";

import { isAuthorizedCommunityReviewer } from "@/lib/community/review-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CommunityReviewAccess =
  | { state: "signed_out" }
  | { state: "identity_unverified"; userId: string }
  | {
      state: "authorized";
      userId: string;
      contributorId: string;
      displayName: string;
      githubLogin: string | null;
      status: string;
    };

export type PendingContributionReview = {
  id: string;
  contributorId: string;
  contributorLabel: string;
  githubLogin: string | null;
  moduleId: string | null;
  moduleName: string | null;
  repository: string;
  source: string;
  contributionType: string;
  description: string;
  githubPrId: number | null;
  githubIssueId: number | null;
  sourceUrl: string | null;
  evidenceState: string | null;
  reviewReady: boolean;
  preliminaryFactors: {
    impact: number;
    difficulty: number;
    scope: number;
    maintenance: number;
    quality: number;
  };
  createdAt: string;
};

export type PendingRereviewRequest = {
  id: string;
  reviewEventId: string;
  contributionEventId: string;
  contributorId: string;
  contributorLabel: string;
  originalAction: "verified" | "rejected";
  originalReason: string;
  originalVerifiedScore: number | null;
  requestReason: string;
  createdAt: string;
};

export type CommunityReviewWorkspace = {
  access: CommunityReviewAccess;
  pending: PendingContributionReview[];
  rereviewRequests: PendingRereviewRequest[];
};

function sourceUrlFor(input: {
  repository: string;
  githubPrId: number | null;
  githubIssueId: number | null;
}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input.repository)) {
    return null;
  }

  const base = `https://github.com/${input.repository}`;
  if (input.githubPrId) return `${base}/pull/${input.githubPrId}`;
  if (input.githubIssueId) return `${base}/issues/${input.githubIssueId}`;
  return base;
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isReviewablePendingEvent(event: {
  contribution_type: string;
  metadata: unknown;
  github_pr_id: number | null;
  github_issue_id: number | null;
}) {
  if (event.contribution_type !== "task_claim") return true;

  const metadata = metadataRecord(event.metadata);
  const evidenceKind = metadata.evidence_kind;
  const evidenceNumber = metadata.evidence_number;
  const evidenceUrl = metadata.evidence_url;

  if (metadata.claim_state !== "under_review" || metadata.review_ready !== true) return false;
  if ((evidenceKind !== "pull_request" && evidenceKind !== "issue") || typeof evidenceNumber !== "number" || typeof evidenceUrl !== "string") return false;
  if (evidenceKind === "pull_request") return event.github_pr_id === evidenceNumber;
  return event.github_issue_id === evidenceNumber;
}

export async function getCommunityReviewWorkspace(): Promise<CommunityReviewWorkspace> {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return { access: { state: "signed_out" }, pending: [], rereviewRequests: [] };
  }

  const admin = createAdminClient();
  const { data: reviewer, error: reviewerError } = await admin
    .from("community_contributors")
    .select("id, user_id, github_login, display_name, status, is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (reviewerError) throw reviewerError;

  if (!reviewer || !isAuthorizedCommunityReviewer(reviewer, user.id)) {
    return {
      access: { state: "identity_unverified", userId: user.id },
      pending: [],
      rereviewRequests: [],
    };
  }

  const [{ data: events, error: eventError }, { data: rereviewRows, error: rereviewError }] = await Promise.all([
    admin
      .from("contribution_events")
      .select(
        "id, contributor_id, module_id, repository, source, contribution_type, description, github_pr_id, github_issue_id, impact_score, difficulty_score, scope_score, maintenance_score, quality_score, metadata, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100),
    admin
      .from("contribution_rereview_requests")
      .select("id, contribution_review_event_id, contribution_event_id, contributor_id, reason, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  if (eventError) throw eventError;
  if (rereviewError) throw rereviewError;

  const reviewableEvents = (events ?? []).filter(isReviewablePendingEvent);
  const contributorIds = [
    ...new Set([
      ...reviewableEvents.map((event) => event.contributor_id),
      ...(rereviewRows ?? []).map((request) => request.contributor_id),
    ]),
  ];
  const moduleIds = [
    ...new Set(
      reviewableEvents
        .map((event) => event.module_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const contributorMap = new Map<
    string,
    { displayName: string | null; githubLogin: string | null }
  >();
  if (contributorIds.length) {
    const { data: contributors, error: contributorError } = await admin
      .from("community_contributors")
      .select("id, display_name, github_login")
      .in("id", contributorIds);
    if (contributorError) throw contributorError;

    for (const contributor of contributors ?? []) {
      contributorMap.set(contributor.id, {
        displayName: contributor.display_name,
        githubLogin: contributor.github_login,
      });
    }
  }

  const moduleMap = new Map<string, string>();
  if (moduleIds.length) {
    const { data: modules, error: moduleError } = await admin
      .from("community_modules")
      .select("id, name")
      .in("id", moduleIds);
    if (moduleError) throw moduleError;

    for (const communityModule of modules ?? []) {
      moduleMap.set(communityModule.id, communityModule.name);
    }
  }

  const pending: PendingContributionReview[] = reviewableEvents.map((event) => {
    const contributor = contributorMap.get(event.contributor_id);
    const githubLogin = contributor?.githubLogin ?? null;
    const metadata = metadataRecord(event.metadata);

    return {
      id: event.id,
      contributorId: event.contributor_id,
      contributorLabel:
        contributor?.displayName ?? githubLogin ?? "Unknown contributor",
      githubLogin,
      moduleId: event.module_id,
      moduleName: event.module_id ? (moduleMap.get(event.module_id) ?? null) : null,
      repository: event.repository,
      source: event.source,
      contributionType: event.contribution_type,
      description: event.description,
      githubPrId: event.github_pr_id,
      githubIssueId: event.github_issue_id,
      sourceUrl: sourceUrlFor({
        repository: event.repository,
        githubPrId: event.github_pr_id,
        githubIssueId: event.github_issue_id,
      }),
      evidenceState: typeof metadata.evidence_state === "string" ? metadata.evidence_state : null,
      reviewReady: event.contribution_type === "task_claim" ? metadata.review_ready === true : true,
      preliminaryFactors: {
        impact: event.impact_score,
        difficulty: event.difficulty_score,
        scope: event.scope_score,
        maintenance: event.maintenance_score,
        quality: event.quality_score,
      },
      createdAt: event.created_at,
    };
  });

  const reviewEventIds = (rereviewRows ?? []).map((request) => request.contribution_review_event_id);
  const reviewEventMap = new Map<string, { action: "verified" | "rejected"; reason: string; score: number | null }>();
  if (reviewEventIds.length) {
    const { data: reviewEvents, error: reviewEventsError } = await admin
      .from("contribution_review_events")
      .select("id, action, reason, new_verified_score")
      .in("id", reviewEventIds);
    if (reviewEventsError) throw reviewEventsError;

    for (const reviewEvent of reviewEvents ?? []) {
      if (reviewEvent.action === "verified" || reviewEvent.action === "rejected") {
        reviewEventMap.set(reviewEvent.id, {
          action: reviewEvent.action,
          reason: reviewEvent.reason,
          score: typeof reviewEvent.new_verified_score === "number" ? reviewEvent.new_verified_score : null,
        });
      }
    }
  }

  const rereviewRequests: PendingRereviewRequest[] = (rereviewRows ?? [])
    .map((request) => {
      const reviewEvent = reviewEventMap.get(request.contribution_review_event_id);
      if (!reviewEvent) return null;
      const contributor = contributorMap.get(request.contributor_id);
      return {
        id: request.id,
        reviewEventId: request.contribution_review_event_id,
        contributionEventId: request.contribution_event_id,
        contributorId: request.contributor_id,
        contributorLabel: contributor?.displayName ?? contributor?.githubLogin ?? "Unknown contributor",
        originalAction: reviewEvent.action,
        originalReason: reviewEvent.reason,
        originalVerifiedScore: reviewEvent.score,
        requestReason: request.reason,
        createdAt: request.created_at,
      };
    })
    .filter((request): request is PendingRereviewRequest => request !== null);

  return {
    access: {
      state: "authorized",
      userId: user.id,
      contributorId: reviewer.id,
      displayName: reviewer.display_name ?? reviewer.github_login ?? "Maintainer",
      githubLogin: reviewer.github_login,
      status: reviewer.status,
    },
    pending,
    rereviewRequests,
  };
}
