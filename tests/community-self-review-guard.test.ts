import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "lib/community/verification.ts"),
  "utf8",
);

describe("community independent review guard", () => {
  it("prevents a contributor from verifying their own event", () => {
    expect(source).toContain('.from("contribution_events")');
    expect(source).toContain("event.contributor_id === input.verifierContributorId");
    expect(source).toContain("Contributors cannot verify their own contribution events.");
    expect(source).toContain("Only pending contribution events can be verified through this workflow.");
    expect(source).toContain("assertStudioTaskReadyForReview(event);");
  });

  it("prevents a contributor from rejecting their own event", () => {
    expect(source).toContain('.from("contribution_events")');
    expect(source).toContain("event.contributor_id === input.verifierContributorId");
    expect(source).toContain("Contributors cannot reject their own contribution events.");
    expect(source).toContain("Only pending contribution events can be rejected through this workflow.");
    expect(source).toContain("assertStudioTaskReadyForReview(event);");
  });

  it("requires review-ready GitHub evidence for Studio task claims", () => {
    expect(source).toContain('claimState !== "under_review" || reviewReady !== true');
    expect(source).toContain("Studio task must be under review with review-ready evidence before it can be resolved.");
    expect(source).toContain("Studio task pull request evidence does not match the ledger record.");
    expect(source).toContain("Studio task issue evidence does not match the ledger record.");
  });
});
