import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("visual scan improvement gallery", () => {
  it("shows continuously varied visual examples after scan findings", () => {
    const page = read("app/projects/[projectId]/page.tsx");
    const gallery = read("components/site-improvement-gallery.tsx");
    expect(page).toContain("SiteImprovementGallery");
    expect(page).toContain('project.scan_status === "complete"');
    expect(gallery).toContain("Show me 6 more directions");
    expect(gallery).toContain("Use this direction");
    expect(gallery).toContain("Hundreds of combinations");
    expect(gallery).toContain("heroTreatments");
    expect(gallery).toContain("proofPatterns");
    expect(gallery).toContain("densities");
  });

  it("sorts findings into a plain-language work order", () => {
    const gallery = read("components/site-improvement-gallery.tsx");
    expect(gallery).toContain("Fix first");
    expect(gallery).toContain("Improve next");
    expect(gallery).toContain("Nice to have");
    expect(gallery).toContain("priorityRank");
    expect(gallery).toContain("Why now:");
  });

  it("routes the full visual system into the existing safe refinement flow", () => {
    const gallery = read("components/site-improvement-gallery.tsx");
    expect(gallery).toContain("/projects/${projectId}/changes");
    expect(gallery).toContain('source: "scan_recommendation"');
    expect(gallery).toContain("Visual direction:");
    expect(gallery).toContain("Priority:");
    expect(gallery).toContain("heroTreatment");
    expect(gallery).toContain("proofPattern");
  });

  it("does not claim copied third-party designs", () => {
    const gallery = read("components/site-improvement-gallery.tsx");
    expect(gallery).toContain("rather than copying somebody else&apos;s website");
    expect(gallery).toContain("No external design is copied");
  });
});
