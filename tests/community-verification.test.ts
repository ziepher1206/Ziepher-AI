import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { calculateVerifiedContributionScore } from "../lib/community/verified-score";

const verificationMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260914062000_community_verification_controls.sql"),
  "utf8",
).toLowerCase();

const scoringMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260914062100_community_scoring_breakdown.sql"),
  "utf8",
).toLowerCase();

describe("community contribution verification", () => {
  it("keeps a single verified event bounded and records its factors", () => {
    const result = calculateVerifiedContributionScore({
      impact: 100,
      difficulty: 100,
      scope: 100,
      quality: 100,
      originality: 100,
      maintenanceValue: 100,
      reliability: 100,
      documentationValue: 100,
      reviewEffort: 100,
      moduleImportance: 100,
      ongoingResponsibility: 100,
      securityImportance: 100,
    });

    expect(result.verifiedScore).toBe(1000);
    expect(result.scoringBreakdown.version).toBe("verified-v1");
    expect(result.scoringBreakdown.max_event_score).toBe(1000);
  });

  it("clamps invalid factor ranges rather than inflating a score", () => {
    const result = calculateVerifiedContributionScore({
      impact: 1000,
      difficulty: -100,
      scope: Number.POSITIVE_INFINITY,
      quality: 100,
      originality: 100,
      maintenanceValue: 100,
      reliability: 100,
      documentationValue: 100,
      reviewEffort: 100,
      moduleImportance: 100,
      ongoingResponsibility: 100,
      securityImportance: 100,
    });

    expect(result.verifiedScore).toBeLessThanOrEqual(1000);
    expect(result.scoringBreakdown.factors.impact).toBe(100);
    expect(result.scoringBreakdown.factors.difficulty).toBe(0);
    expect(result.scoringBreakdown.factors.scope).toBe(0);
  });

  it("blocks silent verification-field updates", () => {
    expect(verificationMigration).toContain("contribution_events_guard_verification");
    expect(verificationMigration).toContain("community_verification_write");
    expect(verificationMigration).toContain("raise exception 'contribution verification fields must be changed through an audited verification function.'");
  });

  it("keeps verification and rejection service-role only", () => {
    expect(scoringMigration).toContain(
      "revoke execute on function public.verify_contribution_event(uuid, uuid, integer, jsonb, text) from public, anon, authenticated;",
    );
    expect(scoringMigration).toContain(
      "grant execute on function public.verify_contribution_event(uuid, uuid, integer, jsonb, text) to service_role;",
    );
    expect(verificationMigration).toContain(
      "revoke execute on function public.reject_contribution_event(uuid, uuid, text) from public, anon, authenticated;",
    );
    expect(verificationMigration).toContain(
      "grant execute on function public.reject_contribution_event(uuid, uuid, text) to service_role;",
    );
  });

  it("requires verified maintainers and append-only review history", () => {
    expect(verificationMigration).toContain("not v_verifier.is_verified");
    expect(verificationMigration).toContain("'module_maintainer', 'core_contributor', 'core_team'");
    expect(verificationMigration).toContain("create table if not exists public.contribution_review_events");
    expect(verificationMigration).toContain("revoke all on table public.contribution_review_events from anon, authenticated;");
    expect(scoringMigration).toContain("p_scoring_breakdown = '{}'::jsonb");
  });
});
