import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life My Day workspace", () => {
  const page = source("app/today/page.tsx");
  const nav = source("components/zlife-mobile-bottom-nav.tsx");

  it("gives My Day a focused page instead of making users hunt through the home screen", () => {
    expect(nav).toContain('{ label: "My Day", href: "/today"');
    expect(page).toContain("Today at a glance");
    expect(page).toContain("What needs your attention");
    expect(page).toContain("Life and business together");
  });

  it("uses real connected business and household counts where available", () => {
    expect(page).toContain('from("leads")');
    expect(page).toContain('from("appointments")');
    expect(page).toContain('from("invoices")');
    expect(page).toContain('from("home_tasks")');
    expect(page).toContain('from("home_maintenance_items")');
    expect(page).toContain("Not connected");
  });

  it("routes end-of-day planning back through the central Z-Life assistant", () => {
    expect(page).toContain('href="/assistant"');
    expect(page).toContain("Review what changed. Plan tomorrow.");
  });
});
