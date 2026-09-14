export type VerifiedContributionFactors = {
  impact: number;
  difficulty: number;
  scope: number;
  quality: number;
  originality: number;
  maintenanceValue: number;
  reliability: number;
  documentationValue: number;
  reviewEffort: number;
  moduleImportance: number;
  ongoingResponsibility: number;
  securityImportance: number;
};

const WEIGHTS: Record<keyof VerifiedContributionFactors, number> = {
  impact: 0.2,
  difficulty: 0.1,
  scope: 0.08,
  quality: 0.16,
  originality: 0.08,
  maintenanceValue: 0.08,
  reliability: 0.08,
  documentationValue: 0.04,
  reviewEffort: 0.04,
  moduleImportance: 0.05,
  ongoingResponsibility: 0.05,
  securityImportance: 0.04,
};

function normalized(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateVerifiedContributionScore(input: VerifiedContributionFactors) {
  const factors = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, normalized(value)]),
  ) as unknown as VerifiedContributionFactors;

  const weighted = (Object.keys(WEIGHTS) as Array<keyof VerifiedContributionFactors>).reduce(
    (total, key) => total + factors[key] * WEIGHTS[key],
    0,
  );

  // 0–1000 points per verified event leaves room for meaningful lifetime totals
  // while keeping any single contribution bounded.
  const verifiedScore = Math.round(weighted * 10);

  return {
    verifiedScore,
    scoringBreakdown: {
      version: "verified-v1",
      factors,
      weights: WEIGHTS,
      max_event_score: 1000,
    },
  } as const;
}
