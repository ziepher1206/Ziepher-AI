import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public community contributor entry point", () => {
  it("keeps the primary contributor resources discoverable", () => {
    const page = read("app/community/page.tsx");

    expect(page).toContain('href="https://github.com/ziepher1206/Ziepher-AI"');
    expect(page).toContain('href="https://github.com/ziepher1206/Ziepher-AI/issues"');
    expect(page).toContain('href="https://github.com/ziepher1206/Ziepher-AI/blob/main/CONTRIBUTING.md"');
    expect(page).toContain('href="https://github.com/ziepher1206/Ziepher-AI/security"');
  });

  it("preserves the public contributor role path and safe contribution flow", () => {
    const page = read("app/community/page.tsx");

    for (const role of [
      "Community Member",
      "Contributor",
      "Verified Contributor",
      "ZLife Developer",
      "Module Maintainer",
      "Core Contributor",
      "Core Team",
    ]) {
      expect(page).toContain(role);
    }

    for (const step of ["Fork", "Branch", "Preview", "Pull Request", "CI + Review"]) {
      expect(page).toContain(step);
    }

    expect(page).toContain("without receiving access to Ziepher Tech production infrastructure");
    expect(page).toContain("does not automatically create employment");
  });

  it("keeps navigation and section labels accessible", () => {
    const page = read("app/community/page.tsx");

    expect(page).toContain('aria-label="Z-Life home"');
    expect(page).toContain('aria-label="Community navigation"');
    expect(page).toContain('id="contributors"');
    expect(page).toContain('id="roles"');
    expect(page).toContain('id="shape"');
    expect(page).toContain('id="build"');
  });
});
