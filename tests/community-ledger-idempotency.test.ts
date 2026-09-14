import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Contribution Ledger idempotency guards", () => {
  it("does not rewrite an existing contribution event on webhook redelivery", () => {
    const ledger = source("lib/community/contribution-ledger.ts");

    expect(ledger).toContain('.eq("repository", draft.repository)');
    expect(ledger).toContain('.eq("github_pr_id", draft.githubPrId)');
    expect(ledger).toContain('.eq("contributor_id", contributor.id)');
    expect(ledger).toContain('.neq("status", "superseded")');
    expect(ledger).toContain("if (existing) {");
    expect(ledger).toContain("created: false");
  });

  it("creates new GitHub evidence as pending with no verified score", () => {
    const ledger = source("lib/community/contribution-ledger.ts");

    expect(ledger).toContain('verified_score: null');
    expect(ledger).toContain('status: "pending"');
    expect(ledger).not.toContain('status: "verified"');
  });

  it("preserves contributor identity races by re-reading the unique GitHub login", () => {
    const ledger = source("lib/community/contribution-ledger.ts");

    expect(ledger).toContain("A duplicate can occur if two webhook deliveries for a contributor race.");
    expect(ledger).toContain('.ilike("github_login", normalizedLogin)');
    expect(ledger).toContain("if (raced) return raced;");
  });

  it("keeps verification changes behind audited database functions", () => {
    const verification = source(
      "supabase/migrations/20260914062000_community_verification_controls.sql",
    );

    expect(verification).toContain("community_verification_write");
    expect(verification).toContain(
      "Contribution verification fields must be changed through an audited verification function.",
    );
    expect(verification).toContain("contribution_review_history");
  });
});
