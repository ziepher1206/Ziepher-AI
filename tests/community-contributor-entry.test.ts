import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("ZLife public contributor entry point", () => {
  it("keeps the required public contributor links visible", () => {
    const page = source("app/community/page.tsx");

    expect(page).toContain("https://github.com/ziepher1206/Ziepher-AI");
    expect(page).toContain("https://github.com/ziepher1206/Ziepher-AI/issues");
    expect(page).toContain("https://github.com/ziepher1206/Ziepher-AI/blob/main/CONTRIBUTING.md");
    expect(page).toContain("https://github.com/ziepher1206/Ziepher-AI/security");
    expect(page).toContain('href="/community/join"');
  });

  it("keeps the contributor role path and reviewed contribution model visible", () => {
    const page = source("app/community/page.tsx");

    for (const role of [
      "Community Member",
      "Contributor",
      "Verified Contributor",
      "ZLife Developer",
      "Module Maintainer",
      "Core Contributor",
      "Core Team",
    ]) expect(page).toContain(role);

    expect(page).toContain("Contribution, not popularity.");
    expect(page).toContain("Only verified ledger data appears here.");
  });

  it("keeps the safe fork-to-review workflow documented", () => {
    const contributing = source("CONTRIBUTING.md");
    const roadmap = source("docs/COMMUNITY-ROADMAP.md");

    expect(contributing).toContain("Fork this repository");
    expect(contributing).toContain("Create a feature branch from `main`");
    expect(contributing).toContain("Open a focused Pull Request against `main`");
    expect(contributing).toContain("Production promotion remains a maintainer-controlled action after review, CI, preview verification, and release gates.");

    expect(roadmap).toContain("forks/branches");
    expect(roadmap).toContain("Pull Requests");
    expect(roadmap).toContain("CI");
    expect(roadmap).toContain("preview verification");
    expect(roadmap).toContain("maintainer review");
  });

  it("keeps accessible labels on the community navigation and brand link", () => {
    const page = source("app/community/page.tsx");

    expect(page).toContain('aria-label="Z-Life home"');
    expect(page).toContain('aria-label="Community navigation"');
    expect(page).toContain('aria-hidden="true"');
  });

  it("keeps production secrets and private data outside the public contribution path", () => {
    const page = source("app/community/page.tsx");
    const contributing = source("CONTRIBUTING.md");

    expect(page).toContain("without receiving access to Ziepher Tech production infrastructure");
    expect(page).toContain("Never post passwords, API keys, private customer information, payment details, session tokens, or unpatched security vulnerabilities");
    expect(contributing).toContain("must not require access to Ziepher Tech production infrastructure");
  });
});
