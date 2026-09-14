import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("community roadmap onboarding", () => {
  it("links contributors to the roadmap governance model", () => {
    const contributing = read("CONTRIBUTING.md");

    expect(contributing).toContain("docs/COMMUNITY-ROADMAP.md");
    expect(contributing).toContain("You do not need to write code to influence ZLife");
    expect(contributing).toContain("Tree Service remains the first active business module");
  });
});
