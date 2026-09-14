export const COMMUNITY_MODULE_IDS = [
  "zlife-core",
  "tree-service",
  "ai-assistant",
  "web-builder",
  "app-builder",
] as const;

export type CommunityModuleId = (typeof COMMUNITY_MODULE_IDS)[number];

export type MergedPullRequestEvidence = {
  repository: string;
  prNumber: number;
  authorLogin: string;
  title: string;
  body?: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  mergedAt: string;
  htmlUrl?: string | null;
};

export type PendingContributionDraft = {
  source: "github_pull_request";
  repository: string;
  moduleId: CommunityModuleId;
  contributionType: string;
  githubPrId: number;
  description: string;
  impactScore: number;
  difficultyScore: number;
  scopeScore: number;
  maintenanceScore: number;
  qualityScore: number;
  status: "pending";
  metadata: Record<string, unknown>;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizedLabels(labels: string[]) {
  return labels.map((label) => label.trim().toLowerCase());
}

export function inferCommunityModule(evidence: Pick<MergedPullRequestEvidence, "labels" | "body">): CommunityModuleId {
  const labels = normalizedLabels(evidence.labels);
  const body = evidence.body?.toLowerCase() ?? "";

  const candidates: Array<[CommunityModuleId, string[]]> = [
    ["tree-service", ["tree service", "tree-service", "module:tree-service"]],
    ["ai-assistant", ["ai assistant", "ai-assistant", "module:ai-assistant"]],
    ["web-builder", ["web builder", "web-builder", "module:web-builder"]],
    ["app-builder", ["app builder", "app-builder", "module:app-builder"]],
    ["zlife-core", ["zlife core", "zlife-core", "module:zlife-core"]],
  ];

  for (const [moduleId, markers] of candidates) {
    if (markers.some((marker) => labels.includes(marker) || body.includes(marker))) {
      return moduleId;
    }
  }

  // Unknown or cross-cutting work starts in Core and remains pending until a
  // maintainer verifies or reassigns it. This never grants verified points.
  return "zlife-core";
}

export function inferContributionType(labels: string[]) {
  const normalized = normalizedLabels(labels);
  const orderedTypes: Array<[string, string[]]> = [
    ["security", ["security"]],
    ["architecture", ["architecture"]],
    ["ui_ux", ["ui", "ux", "ui / ux", "design"]],
    ["testing", ["testing", "tests"]],
    ["documentation", ["documentation", "docs"]],
    ["maintenance", ["maintenance", "refactor"]],
    ["accessibility", ["accessibility", "a11y"]],
    ["backend", ["backend", "supabase"]],
    ["frontend", ["frontend"]],
    ["ai", ["ai"]],
  ];

  for (const [type, markers] of orderedTypes) {
    if (markers.some((marker) => normalized.includes(marker))) return type;
  }

  return "code";
}

export function buildPendingContributionDraft(evidence: MergedPullRequestEvidence): PendingContributionDraft {
  const labels = normalizedLabels(evidence.labels);
  const linesChanged = Math.max(0, evidence.additions) + Math.max(0, evidence.deletions);
  const changedFiles = Math.max(0, evidence.changedFiles);

  const difficultyScore = labels.includes("advanced")
    ? 80
    : labels.includes("intermediate")
      ? 55
      : labels.includes("beginner")
        ? 30
        : labels.includes("good first issue")
          ? 15
          : 35;

  const impactBase = labels.includes("security")
    ? 70
    : labels.includes("architecture")
      ? 60
      : labels.includes("accessibility") || labels.includes("a11y")
        ? 50
        : labels.includes("documentation") || labels.includes("docs")
          ? 30
          : 40;

  // Scope is deliberately capped and logarithmic-ish. Large diffs do not earn
  // proportionally large value and commit count is never considered.
  const scopeScore = clampScore(
    Math.min(55, changedFiles * 5) + Math.min(25, Math.log10(linesChanged + 1) * 10),
  );

  const maintenanceScore = labels.some((label) => ["maintenance", "refactor", "bug"].includes(label))
    ? 55
    : 20;

  return {
    source: "github_pull_request",
    repository: evidence.repository,
    moduleId: inferCommunityModule(evidence),
    contributionType: inferContributionType(evidence.labels),
    githubPrId: evidence.prNumber,
    description: evidence.title.trim(),
    impactScore: clampScore(impactBase),
    difficultyScore: clampScore(difficultyScore),
    scopeScore,
    maintenanceScore: clampScore(maintenanceScore),
    // Quality requires maintainer review. Automatic ingestion must never imply
    // code quality or award verified contribution value.
    qualityScore: 0,
    status: "pending",
    metadata: {
      github_author: evidence.authorLogin,
      additions: Math.max(0, evidence.additions),
      deletions: Math.max(0, evidence.deletions),
      changed_files: changedFiles,
      labels: evidence.labels,
      merged_at: evidence.mergedAt,
      github_url: evidence.htmlUrl ?? null,
      scoring_version: "pending-pr-v1",
      verified_value_awarded: false,
    },
  };
}
