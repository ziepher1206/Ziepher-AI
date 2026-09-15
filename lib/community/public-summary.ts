import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicContributorSummary = {
  githubLogin: string;
  displayName: string | null;
  status: string;
  lifetimeScore: number;
  recent90DayScore: number;
  lifetimeContributionPercent: number;
  recentContributionPercent: number;
  verifiedContributionCount: number;
  recent90DayVerifiedCount: number;
  activeModuleCount: number;
  contributionTypes: Record<string, number>;
  modules: Array<{ id: string; name: string; score: number; contributionPercent: number }>;
};

function percent(part: number, whole: number) {
  if (whole <= 0 || part <= 0) return 0;
  return Math.round((part / whole) * 10000) / 100;
}

export async function getPublicContributorSummaries(): Promise<PublicContributorSummary[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];

  const supabase = createAdminClient();
  const { data: contributors, error: contributorError } = await supabase
    .from("community_contributors")
    .select("id, github_login, display_name, status")
    .eq("is_verified", true)
    .not("github_login", "is", null)
    .order("created_at", { ascending: true });

  if (contributorError) throw contributorError;
  if (!contributors?.length) return [];

  const ids = contributors.map((contributor) => contributor.id);
  const { data: events, error: eventError } = await supabase
    .from("contribution_events")
    .select("contributor_id, module_id, contribution_type, verified_score, verified_at")
    .in("contributor_id", ids)
    .eq("status", "verified")
    .not("verified_score", "is", null);

  if (eventError) throw eventError;

  const moduleIds = [...new Set((events ?? []).map((event) => event.module_id).filter(Boolean))] as string[];
  const moduleNames = new Map<string, string>();
  if (moduleIds.length) {
    const { data: moduleRows, error: moduleError } = await supabase
      .from("community_modules")
      .select("id, name")
      .in("id", moduleIds);
    if (moduleError) throw moduleError;
    for (const moduleRow of moduleRows ?? []) moduleNames.set(moduleRow.id, moduleRow.name);
  }

  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const totalLifetime = (events ?? []).reduce((sum, event) => sum + (event.verified_score ?? 0), 0);
  const totalRecent = (events ?? []).reduce((sum, event) => {
    const verifiedAt = event.verified_at ? Date.parse(event.verified_at) : 0;
    return sum + (verifiedAt >= cutoff ? event.verified_score ?? 0 : 0);
  }, 0);

  const moduleTotals = new Map<string, number>();
  for (const event of events ?? []) {
    if (!event.module_id) continue;
    moduleTotals.set(event.module_id, (moduleTotals.get(event.module_id) ?? 0) + (event.verified_score ?? 0));
  }

  return contributors.map((contributor) => {
    const ownEvents = (events ?? []).filter((event) => event.contributor_id === contributor.id);
    const lifetimeScore = ownEvents.reduce((sum, event) => sum + (event.verified_score ?? 0), 0);
    const recentEvents = ownEvents.filter((event) => {
      const verifiedAt = event.verified_at ? Date.parse(event.verified_at) : 0;
      return verifiedAt >= cutoff;
    });
    const recent90DayScore = recentEvents.reduce((sum, event) => sum + (event.verified_score ?? 0), 0);

    const contributionTypes: Record<string, number> = {};
    const contributorModuleScores = new Map<string, number>();
    for (const event of ownEvents) {
      const score = event.verified_score ?? 0;
      contributionTypes[event.contribution_type] = (contributionTypes[event.contribution_type] ?? 0) + score;
      if (event.module_id) {
        contributorModuleScores.set(event.module_id, (contributorModuleScores.get(event.module_id) ?? 0) + score);
      }
    }

    return {
      githubLogin: contributor.github_login as string,
      displayName: contributor.display_name,
      status: contributor.status,
      lifetimeScore,
      recent90DayScore,
      lifetimeContributionPercent: percent(lifetimeScore, totalLifetime),
      recentContributionPercent: percent(recent90DayScore, totalRecent),
      verifiedContributionCount: ownEvents.length,
      recent90DayVerifiedCount: recentEvents.length,
      activeModuleCount: contributorModuleScores.size,
      contributionTypes,
      modules: [...contributorModuleScores.entries()].map(([id, score]) => ({
        id,
        name: moduleNames.get(id) ?? id,
        score,
        contributionPercent: percent(score, moduleTotals.get(id) ?? 0),
      })),
    };
  });
}
