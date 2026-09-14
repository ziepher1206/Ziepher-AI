import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public community intake", () => {
  it("keeps a safe public bug-report path", () => {
    const bug = read(".github/ISSUE_TEMPLATE/bug-report.md");

    expect(bug).toContain("Public bug report");
    expect(bug).toContain("SECURITY.md");
    expect(bug).toContain("private customer data");
    expect(bug).toContain("production credentials");
  });

  it("keeps a public feature and module proposal path", () => {
    const proposal = read(".github/ISSUE_TEMPLATE/feature-proposal.md");

    expect(proposal).toContain("Public feature or module proposal");
    expect(proposal).toContain("New module idea");
    expect(proposal).toContain("help build this");
    expect(proposal).toContain("does not create employment, ownership, equity, compensation");
  });
});
