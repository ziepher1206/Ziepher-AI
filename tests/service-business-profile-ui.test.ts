import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("service business profile UI", () => {
  it("presents Business as one OS rather than a Tree Service-only product", () => {
    const page = source("app/operate/page.tsx");
    expect(page).toContain("SERVICE BUSINESS OS");
    expect(page).toContain("Your industry profile changes the trade-specific details");
    expect(page).toContain("Service Business Profile");
    expect(page).toContain("Tree Service is the first active profile");
    expect(page).not.toContain("BUSINESS · TREE SERVICE");
  });

  it("shows an industry selector in business setup", () => {
    const page = source("app/operate/setup/page.tsx");
    expect(page).toContain("What kind of service business do you run?");
    expect(page).toContain("zlife_service_industries");
    expect(page).toContain("selectBusinessIndustryAction");
    expect(page).toContain("Tree Service is the first fully active profile");
    expect(page).toContain("Database update pending");
  });

  it("keeps preview industries from activating before validation", () => {
    const action = source("app/operate/setup/industry-actions.ts");
    expect(action).toContain('.eq("status", "available")');
    expect(action).toContain("This industry profile is not active yet.");
  });
});
