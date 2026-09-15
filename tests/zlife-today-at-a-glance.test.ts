import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life Today at a Glance", () => {
  const page = source("app/dashboard/page.tsx");

  it("uses real connected workspace records instead of invented totals", () => {
    expect(page).toContain('from("leads")');
    expect(page).toContain('from("appointments")');
    expect(page).toContain('from("invoices")');
    expect(page).toContain('from("home_tasks")');
    expect(page).toContain('from("home_maintenance_items")');
    expect(page).toContain("Real connected data where it exists");
    expect(page).toContain("instead of displaying invented data");
  });

  it("degrades clearly when optional module schemas are not connected", () => {
    expect(page).toContain("isOptionalSchemaMissing");
    expect(page).toContain('value: homeDataReady ? String(openHomeTasks) : "Connect"');
    expect(page).toContain('value: businessDataReady ? String(newLeads) : "Connect"');
  });

  it("links daily signals directly to the relevant workflow", () => {
    expect(page).toContain('href: "/home"');
    expect(page).toContain('href: "/operate"');
    expect(page).toContain('href: "/operate/calendar"');
    expect(page).toContain('href: "/operate/invoices"');
    expect(page).toContain('href: "/assistant"');
    expect(page).toContain('href="/today"');
  });
});
