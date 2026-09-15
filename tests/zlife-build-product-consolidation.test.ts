import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = [
  "app/projects/page.tsx",
  "app/projects/[projectId]/page.tsx",
  "app/projects/[projectId]/changes/page.tsx",
  "app/projects/[projectId]/media/page.tsx",
  "app/projects/[projectId]/usage/page.tsx",
  "components/site-onboarding-form.tsx",
  "components/site-change-request-workflow.tsx",
  "components/site-media-upload.tsx",
].map((path) => ({ path, source: readFileSync(path, "utf8") }));

describe("Z-Life Build product consolidation", () => {
  it("presents authenticated website work as Z-Life Build rather than a separate legacy product", () => {
    for (const { path, source } of files) {
      expect(source, path).not.toContain('brand-title">SITEREFINER');
      expect(source, path).not.toContain("Tell SiteRefiner");
      expect(source, path).not.toContain("SiteRefiner will use");
      expect(source, path).not.toContain("what SiteRefiner records");
      expect(source, path).not.toContain("until SiteRefiner uses");
    }

    expect(files.find((item) => item.path === "app/projects/page.tsx")?.source).toContain(
      'brand-title">Z-LIFE BUILD',
    );
    expect(files.find((item) => item.path === "app/projects/[projectId]/page.tsx")?.source).toContain(
      'brand-title">Z-LIFE BUILD',
    );
  });

  it("keeps legacy technical environment identifiers intact for compatibility", () => {
    const changes = files.find((item) => item.path === "app/projects/[projectId]/changes/page.tsx")!.source;
    const project = files.find((item) => item.path === "app/projects/[projectId]/page.tsx")!.source;
    expect(changes).toContain("SITE_REFINER_PAID_AI_ENABLED");
    expect(changes).toContain("SITE_REFINER_PAID_BUILDS_ENABLED");
    expect(project).toContain("SITE_REFINER_PAID_AI_ENABLED");
  });

  it("keeps Build release actions behind the existing approval workflow", () => {
    const project = files.find((item) => item.path === "app/projects/[projectId]/page.tsx")!.source;
    const changes = files.find((item) => item.path === "app/projects/[projectId]/changes/page.tsx")!.source;
    expect(project).toContain("approval before production");
    expect(changes).toContain("Separate approval required");
    expect(changes).toContain("exact-SHA approval workflow");
  });
});
