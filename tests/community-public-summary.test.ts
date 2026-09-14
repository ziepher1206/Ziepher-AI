import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const summarySource = readFileSync(
  join(process.cwd(), "lib/community/public-summary.ts"),
  "utf8",
);

const communityPageSource = readFileSync(
  join(process.cwd(), "app/community/page.tsx"),
  "utf8",
);

describe("public ZLife community data", () => {
  it("publishes only verified contributor identities and verified contribution events", () => {
    expect(summarySource).toContain('.eq("is_verified", true)');
    expect(summarySource).toContain('.eq("status", "verified")');
    expect(summarySource).toContain('.not("verified_score", "is", null)');
  });

  it("does not use pending activity or raw commit counts for public contribution percentages", () => {
    expect(summarySource).not.toContain('.eq("status", "pending")');
    expect(summarySource).not.toContain("commit_count");
  });

  it("keeps role recognition distinct from legal employment and ownership status", () => {
    expect(communityPageSource).toContain(
      "do not automatically create employment, contractor, partnership, equity, or ownership status",
    );
  });

  it("labels zero-cost community development as a target rather than a guarantee", () => {
    expect(communityPageSource).toContain("$0 target");
    expect(communityPageSource).toContain("Added Ziepher Tech platform cost per contributor");
  });
});
