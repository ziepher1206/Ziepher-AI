import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Tree Service Phase 7 Ziepher Assistant guards", () => {
  it("prioritizes real launch-loop records", () => {
    const page = source("app/operate/assistant/page.tsx");
    for (const table of ["leads", "estimates", "jobs", "invoices", "operate_review_requests", "marketing_campaigns"]) {
      expect(page).toContain(`from(\"${table}\")`);
    }
    expect(page).toContain("Prepared next actions");
    expect(page).toContain("scheduled job");
  });

  it("covers the launch examples without requiring paid AI", () => {
    const page = source("app/operate/assistant/page.tsx");
    expect(page).toContain("new lead");
    expect(page).toContain("expires");
    expect(page).toContain("assigned_crew_id");
    expect(page).toContain("Assign crew");
    expect(page).toContain("overdue invoice");
    expect(page).toContain("campaign");
    expect(page).toContain("Zero-cost advisor mode");
    expect(page).toContain("costs no AI tokens");
  });

  it("does not execute risky actions", () => {
    const page = source("app/operate/assistant/page.tsx");
    expect(page).toContain("Customer messages");
    expect(page).toContain("social publishing");
    expect(page).toContain("paid ads");
    expect(page).toContain("production website releases");
    expect(page).toContain("live Stripe charges");
    expect(page).toContain("require explicit approval");
  });

  it("is visible from the daily dashboard", () => {
    const priorities = source("components/operate-daily-priorities.tsx");
    expect(priorities).toContain('href="/operate/assistant"');
    expect(priorities).toContain("Open full assistant");
    expect(priorities).toContain("No paid AI call is used");
  });
});
