import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("builder end-to-end navigation contract", () => {
  it("keeps the five-stage builder journey in the intended order", () => {
    const progress = read("components/builder-progress.tsx");

    expect(progress).toContain('label: "Build"');
    expect(progress).toContain('label: "References"');
    expect(progress).toContain('label: "Preview & Refine"');
    expect(progress).toContain('label: "Domain"');
    expect(progress).toContain('label: "Publish Ready"');
    expect(progress).toContain('suffix: "/media"');
    expect(progress).toContain('suffix: "/studio"');
    expect(progress).toContain('suffix: "/domains"');
    expect(progress).toContain('suffix: "/publish"');
  });

  it("routes a new build from onboarding into references", () => {
    const onboarding = read("components/site-onboarding-form.tsx");
    expect(onboarding).toContain("/media");
    expect(onboarding).toContain("Step 1 of 5");
  });

  it("keeps preview refinement and reference editing reachable from studio", () => {
    const studio = read("app/projects/[projectId]/studio/page.tsx");
    expect(studio).toContain("Tell Z-Life What to Change");
    expect(studio).toContain("Add Photos & References");
    expect(studio).toContain("Continue to Domain");
    expect(studio).toContain("/changes");
    expect(studio).toContain("/media");
    expect(studio).toContain("/domains");
  });

  it("routes domain selection into publish readiness without publishing", () => {
    const domains = read("app/projects/[projectId]/domains/page.tsx");
    const publish = read("app/projects/[projectId]/publish/page.tsx");

    expect(domains).toContain("Continue to Publish Readiness");
    expect(domains).toContain("/publish");
    expect(publish).toContain("Production publish requires approval");
    expect(publish).toContain("No release is triggered from this checklist");
  });
});
