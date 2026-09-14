import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("community review actions", () => {
  it("derives reviewer identity from the authenticated server workspace", () => {
    const actions = read("app/community/review/actions.ts");

    expect(actions).toContain('"use server"');
    expect(actions).toContain("getCommunityReviewWorkspace()");
    expect(actions).toContain('workspace.access.state !== "authorized"');
    expect(actions).toContain("verifierContributorId: reviewer.contributorId");
    expect(actions).not.toContain("verifierContributorId: input.");
  });

  it("validates reviewer-controlled factors and reasons server-side", () => {
    const actions = read("app/community/review/actions.ts");

    expect(actions).toContain("z.coerce.number().min(0).max(100)");
    expect(actions).toContain("z.string().trim().min(3).max(2000)");
    expect(actions).toContain("verifyContributionEvent");
    expect(actions).toContain("rejectContributionEvent");
  });

  it("keeps review UI behind verified identity and server actions", () => {
    const page = read("app/community/review/page.tsx");
    const controls = read("app/community/review/review-actions.tsx");

    expect(page).toContain("ContributionReviewActions");
    expect(page).toContain("Connect GitHub identity");
    expect(controls).toContain("action={verifyContributionAction}");
    expect(controls).toContain("action={rejectContributionAction}");
  });
});
