import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("visual scan improvement gallery", () => {
  it("shows visual examples after scan findings", () => {
    const page = read("app/projects/[projectId]/page.tsx");
    const gallery = read("components/site-improvement-gallery.tsx");
    expect(page).toContain("SiteImprovementGallery");
    expect(page).toContain('project.scan_status === "complete"');
    expect(gallery).toContain("Show me more examples");
    expect(gallery).toContain("Use this direction");
    expect(gallery).toContain("Browse endlessly");
  });

  it("routes a selected visual direction into the existing safe refinement flow", () => {
    const gallery = read("components/site-improvement-gallery.tsx");
    expect(gallery).toContain(`/projects/${projectId}/changes`);
    expect(gallery).toContain('source: "scan_recommendation"');
    expect(gallery).toContain("Visual direction:");
  });

  it("does not claim copied third-party designs", () => {
    const gallery = read("components/site-improvement-gallery.tsx");
    expect(gallery).toContain("rather than copied websites");
    expect(gallery).toContain("No external design is copied");
  });
});
