import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("studio design quality panel", () => {
  it("shows stored visual QA beside a built preview", () => {
    const page = read("app/projects/[projectId]/studio/page.tsx");
    const panel = read("components/project-visual-quality-panel.tsx");
    expect(page).toContain("ProjectVisualQualityPanel");
    expect(page).toContain("hasBuiltPreview");
    expect(panel).toContain("Design Quality");
    expect(panel).toContain("Improve these areas");
  });

  it("reads existing build results instead of spending AI credits", () => {
    const route = read("app/api/projects/[projectId]/visual-quality/route.ts");
    const panel = read("components/project-visual-quality-panel.tsx");
    expect(route).toContain('from("build_steps")');
    expect(route).toContain('step_type", "generate"');
    expect(panel).toContain("local rules only");
    expect(panel).not.toContain("OPENAI_API_KEY");
  });

  it("routes quality findings into the existing refinement flow", () => {
    const panel = read("components/project-visual-quality-panel.tsx");
    expect(panel).toContain("/changes");
    expect(panel).toContain('source: "visual_qa"');
    expect(panel).toContain("Improve the current preview using these Design Quality findings");
  });
});
