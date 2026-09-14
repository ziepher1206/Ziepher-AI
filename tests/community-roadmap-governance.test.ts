import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("community roadmap governance", () => {
  it("keeps a transparent evidence-based proposal lifecycle", () => {
    const roadmap = read("docs/COMMUNITY-ROADMAP.md");

    expect(roadmap).toContain("Submitted");
    expect(roadmap).toContain("Triaged");
    expect(roadmap).toContain("Roadmap decision");
    expect(roadmap).toContain("Built and reviewed");
    expect(roadmap).toContain("Released or closed");
    expect(roadmap).toContain("must never be the sole basis for roadmap priority");
  });

  it("preserves maintainer, safety, and Tree Service launch boundaries", () => {
    const roadmap = read("docs/COMMUNITY-ROADMAP.md");

    expect(roadmap).toContain("Tree Service remains the first active business module");
    expect(roadmap).toContain("deploy to production");
    expect(roadmap).toContain("spend Ziepher Tech money or credits");
    expect(roadmap).toContain("existing 22-agent ZLife team");
    expect(roadmap).toContain("does not guarantee Contribution Ledger value");
  });
});
