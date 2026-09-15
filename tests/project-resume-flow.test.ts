import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("returning builder projects", () => {
  it("routes unfinished projects to references first", () => {
    const page = read("app/projects/page.tsx");
    expect(page).toContain('label: "Step 2 · Add photos & references"');
    expect(page).toContain('href: `/projects/${project.id}/media`');
  });

  it("routes built projects to preview and refinement before domain", () => {
    const page = read("app/projects/page.tsx");
    expect(page).toContain('label: "Step 3 · Review & refine"');
    expect(page).toContain('href: `/projects/${project.id}/studio`');
  });

  it("routes projects with a selected domain to publish readiness", () => {
    const page = read("app/projects/page.tsx");
    expect(page).toContain('label: "Step 5 · Check publish readiness"');
    expect(page).toContain('href: `/projects/${project.id}/publish`');
    expect(page).toContain("Continue exactly where you left off");
  });
});
