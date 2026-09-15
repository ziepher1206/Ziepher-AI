import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("studio simple release path", () => {
  it("keeps the normal builder focused on refine, domain, and publish readiness", () => {
    const page = read("app/projects/[projectId]/studio/page.tsx");

    expect(page).toContain("Continue to Domain");
    expect(page).toContain("Tell Z-Life What to Change");
    expect(page).toContain("Add Photos & References");
    expect(page).toContain("Production release still requires explicit approval");
  });

  it("hides the legacy direct deployment controls from the main studio toolbar", () => {
    const page = read("app/projects/[projectId]/studio/page.tsx");
    const shell = read("components/studio-shell.tsx");

    expect(shell).toContain("Deploy preview");
    expect(shell).toContain("Go live");
    expect(page).toContain(".preview-toolbar .inline-actions > button:has(+ button.primary)");
    expect(page).toContain(".preview-toolbar .inline-actions > button.primary");
  });

  it("keeps progress and action controls from covering the mobile preview", () => {
    const page = read("app/projects/[projectId]/studio/page.tsx");

    expect(page).toContain("@media (max-width: 720px)");
    expect(page).toContain(".zlife-studio-progress");
    expect(page).toContain(".zlife-studio-actions");
    expect(page).toContain("position: sticky !important");
    expect(page).toContain("max-height: 38vh !important");
  });
});
