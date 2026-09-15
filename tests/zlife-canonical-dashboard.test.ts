import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("canonical Z-Life signed-in dashboard", () => {
  it("keeps the approved Z-Life visual language and core navigation", () => {
    const page = source("app/dashboard/page.tsx");
    expect(page).toContain("#02090b");
    expect(page).toContain("#38e0f3");
    expect(page).toContain("#10d981");
    expect(page).toContain("Z <span");
    expect(page).toContain("⌁");
    expect(page).toContain('href="/assistant"');
    expect(page).toContain('href="/today"');
    expect(page).toContain('href="/dashboard/modules"');
  });

  it("keeps Today at a Glance and quick module access on the home screen", () => {
    const page = source("app/dashboard/page.tsx");
    expect(page).toContain("Today at a glance");
    expect(page).toContain("Quick access");
    expect(page).toContain("Life & personal");
    expect(page).toContain("Bills & payments");
    expect(page).toContain("Auto & vehicle");
    expect(page).toContain("End of day");
    expect(page).toContain("Open My Day");
  });

  it("keeps Z-Life modular instead of forcing every module onto the dashboard", () => {
    const page = source("app/dashboard/page.tsx");
    const modulesPage = source("app/dashboard/modules/page.tsx");
    expect(page).toContain("previewModules = modules.slice(0, 8)");
    expect(page).toContain("Plug in only the parts you want");
    expect(modulesPage).toContain("Choose only what you need");
    expect(modulesPage).toContain("Remove from my Z-Life");
    expect(modulesPage).toContain("Plug into my Z-Life");
  });
});
