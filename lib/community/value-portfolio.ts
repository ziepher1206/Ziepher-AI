import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type ContributorValueAsset = {
  id: string;
  slug: string;
  name: string;
  assetType: string;
  moduleId: string | null;
  effectiveShares: number;
  ownershipPercent: number;
  shareClasses: Record<string, number>;
  downstreamDependencies: number;
  latestSimulatedAmount: number | null;
};

export type ContributorValuePortfolio = {
  contributorId: string;
  githubLogin: string;
  displayName: string | null;
  status: string;
  totalEffectiveShares: number;
  assets: ContributorValueAsset[];
  latestSimulation: {
    id: string;
    poolAmount: number;
    currency: string;
    completedAt: string | null;
    contributorAmount: number;
  } | null;
};

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, places = 4) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

export async function getContributorValuePortfolios(): Promise<ContributorValuePortfolio[]> {
  const supabase = createAdminClient();

  const { data: contributors, error: contributorError } = await supabase
    .from("community_contributors")
    .select("id, github_login, display_name, status")
    .eq("is_verified", true)
    .not("github_login", "is", null)
    .order("created_at", { ascending: true });

  if (contributorError) throw contributorError;
  if (!contributors?.length) return [];

  const contributorIds = contributors.map((row) => row.id);

  const [{ data: shares, error: shareError }, { data: assets, error: assetError }, { data: lineage, error: lineageError }, { data: simulations, error: simulationError }] = await Promise.all([
    supabase
      .from("value_verified_effective_shares")
      .select("value_asset_id, contributor_id, share_class, effective_share")
      .in("contributor_id", contributorIds),
    supabase
      .from("value_assets")
      .select("id, slug, name, asset_type, module_id, status")
      .in("status", ["active", "maintenance"]),
    supabase
      .from("value_lineage_edges")
      .select("upstream_asset_id, downstream_asset_id")
      .eq("status", "verified"),
    supabase
      .from("value_reward_simulations")
      .select("id, hypothetical_pool_amount, hypothetical_currency, completed_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1),
  ]);

  if (shareError) throw shareError;
  if (assetError) throw assetError;
  if (lineageError) throw lineageError;
  if (simulationError) throw simulationError;

  const assetMap = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const assetTotals = new Map<string, number>();
  const downstreamCounts = new Map<string, number>();

  for (const share of shares ?? []) {
    const amount = Math.max(0, numberValue(share.effective_share));
    assetTotals.set(share.value_asset_id, (assetTotals.get(share.value_asset_id) ?? 0) + amount);
  }

  for (const edge of lineage ?? []) {
    downstreamCounts.set(edge.upstream_asset_id, (downstreamCounts.get(edge.upstream_asset_id) ?? 0) + 1);
  }

  const latestSimulation = simulations?.[0] ?? null;
  let allocations: Array<{ contributor_id: string; value_asset_id: string | null; total_amount: unknown }> = [];

  if (latestSimulation) {
    const { data, error } = await supabase
      .from("value_reward_simulation_allocations")
      .select("contributor_id, value_asset_id, total_amount")
      .eq("simulation_id", latestSimulation.id)
      .in("contributor_id", contributorIds);
    if (error) throw error;
    allocations = data ?? [];
  }

  const allocationByContributorAsset = new Map<string, number>();
  const allocationByContributor = new Map<string, number>();
  for (const allocation of allocations) {
    const amount = numberValue(allocation.total_amount);
    allocationByContributor.set(
      allocation.contributor_id,
      (allocationByContributor.get(allocation.contributor_id) ?? 0) + amount,
    );
    if (allocation.value_asset_id) {
      allocationByContributorAsset.set(
        `${allocation.contributor_id}:${allocation.value_asset_id}`,
        (allocationByContributorAsset.get(`${allocation.contributor_id}:${allocation.value_asset_id}`) ?? 0) + amount,
      );
    }
  }

  return contributors.map((contributor) => {
    const ownShares = (shares ?? []).filter((share) => share.contributor_id === contributor.id);
    const grouped = new Map<string, { total: number; classes: Record<string, number> }>();

    for (const share of ownShares) {
      const amount = Math.max(0, numberValue(share.effective_share));
      const current = grouped.get(share.value_asset_id) ?? { total: 0, classes: {} };
      current.total += amount;
      current.classes[share.share_class] = (current.classes[share.share_class] ?? 0) + amount;
      grouped.set(share.value_asset_id, current);
    }

    const portfolioAssets: ContributorValueAsset[] = [...grouped.entries()]
      .map(([assetId, groupedShares]) => {
        const asset = assetMap.get(assetId);
        if (!asset) return null;
        const totalForAsset = assetTotals.get(assetId) ?? 0;
        return {
          id: asset.id,
          slug: asset.slug,
          name: asset.name,
          assetType: asset.asset_type,
          moduleId: asset.module_id,
          effectiveShares: round(groupedShares.total),
          ownershipPercent: totalForAsset > 0 ? round((groupedShares.total / totalForAsset) * 100, 2) : 0,
          shareClasses: Object.fromEntries(
            Object.entries(groupedShares.classes).map(([key, value]) => [key, round(value)]),
          ),
          downstreamDependencies: downstreamCounts.get(assetId) ?? 0,
          latestSimulatedAmount: latestSimulation
            ? round(allocationByContributorAsset.get(`${contributor.id}:${assetId}`) ?? 0, 2)
            : null,
        };
      })
      .filter((asset): asset is ContributorValueAsset => Boolean(asset))
      .sort((a, b) => b.effectiveShares - a.effectiveShares);

    const totalEffectiveShares = portfolioAssets.reduce((sum, asset) => sum + asset.effectiveShares, 0);

    return {
      contributorId: contributor.id,
      githubLogin: contributor.github_login as string,
      displayName: contributor.display_name,
      status: contributor.status,
      totalEffectiveShares: round(totalEffectiveShares),
      assets: portfolioAssets,
      latestSimulation: latestSimulation
        ? {
            id: latestSimulation.id,
            poolAmount: numberValue(latestSimulation.hypothetical_pool_amount),
            currency: latestSimulation.hypothetical_currency,
            completedAt: latestSimulation.completed_at,
            contributorAmount: round(allocationByContributor.get(contributor.id) ?? 0, 2),
          }
        : null,
    };
  });
}
