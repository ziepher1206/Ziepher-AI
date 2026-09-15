import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("guided builder progress", () => {
  it("defines the five launch stages", () => {
    const progress = read("components/builder-progress.tsx");
    expect(progress).toContain('label: "Build"');
    expect(progress).toContain('label: "References"');
    expect(progress).toContain('label: "Preview & Refine"');
    expect(progress).toContain('label: "Domain"');
    expect(progress).toContain('label: "Publish Ready"');
    expect(progress).toContain('aria-label="Builder progress"');
  });

  it("appears throughout the launch flow", () => {
    const media = read("app/projects/[projectId]/media/page.tsx");
    const studio = read("app/projects/[projectId]/studio/page.tsx");
    const changes = read("app/projects/[projectId]/changes/page.tsx");
    const domains = read("app/projects/[projectId]/domains/page.tsx");
    const publish = read("app/projects/[projectId]/publish/page.tsx");
    for (const page of [media, studio, changes, domains, publish]) {
      expect(page).toContain("BuilderProgress");
    }
  });

  it("does not add publishing or provider actions", () => {
    const progress = read("components/builder-progress.tsx");
    expect(progress).not.toContain("fetch(");
    expect(progress).not.toContain("OPENAI_API_KEY");
    expect(progress).not.toContain("deploy");
  });
});
