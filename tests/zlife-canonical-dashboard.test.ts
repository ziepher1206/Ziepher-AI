import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("canonical Z-Life signed-in dashboard", () => {
  it("keeps the approved Z-Life visual language and the two primary actions", () => {
    const page = source("app/dashboard/page.tsx");
    expect(page).toContain("#02090b");
    expect(page).toContain("#38e0f3");
    expect(page).toContain("#10d981");
    expect(page).toContain("⌁");
    expect(page).toContain("What do you want to do?");
    expect(page).toContain("Ask Z-Life");
    expect(page).toContain("My Day");
  });

  it("shows only useful attention signals instead of a giant checklist", () => {
    const page = source("app/dashboard/page.tsx");
    expect(page).toContain("Only what needs attention");
    expect(page).toContain("New leads");
    expect(page).toContain("Next 24 hours");
    expect(page).toContain("Overdue");
    expect(page).toContain("Home tasks");
    expect(page).not.toContain("Grocery & shopping");
    expect(page).not.toContain("Auto & vehicle");
  });

  it("keeps unfinished modules off the main interface", () => {
    const page = source("app/dashboard/page.tsx");
    expect(page).toContain('catalog.status === "active"');
    expect(page).toContain("Things you can actually use");
    expect(page).toContain("Preview modules and unfinished controls stay out of the main interface until they actually work");
    expect(page).toContain('installedModules.slice(0, 4)');
  });
});
