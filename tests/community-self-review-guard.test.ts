import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "lib/community/verification.ts"),
  "utf8",
);

describe("community independent review guard", () => {
  it("prevents a contributor from verifying their own event", () => {
    expect(source).toContain('select("id, contributor_id, status, impact_score, difficulty_score, scope_score, maintenance_score")');
    expect(source).toContain("event.contributor_id === input.verifierContributorId");
    expect(source).toContain("Contributors cannot verify their own contribution events.");
  });

  it("prevents a contributor from rejecting their own event", () => {
    expect(source).toContain('select("id, contributor_id, status")');
    expect(source).toContain("Contributors cannot reject their own contribution events.");
    expect(source).toContain("Only pending contribution events can be rejected through this workflow.");
  });
});
