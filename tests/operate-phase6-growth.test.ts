import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Tree Service Phase 6 website and growth guards", () => {
  it("provides one Tree Service growth workspace backed by recorded business data", () => {
    const page = source("app/operate/growth/page.tsx");
    expect(page).toContain("Website & growth");
    expect(page).toContain('from("operate_review_requests")');
    expect(page).toContain('from("marketing_source_spend")');
    expect(page).toContain('from("projects")');
    expect(page).toContain("deterministic recommendations");
  });

  it("keeps marketing actions approval-gated instead of automatic", () => {
    const page = source("app/operate/growth/page.tsx");
    const campaign = source("app/projects/[projectId]/campaigns/page.tsx");
    expect(page).toContain("does not automatically publish website changes");
    expect(page).toContain("post to social accounts");
    expect(page).toContain("launch ads");
    expect(page).toContain("send review requests");
    expect(campaign).toContain("Do not publish automatically");
  });

  it("uses Ziepher Grow branding rather than the old standalone SiteRefiner campaign branding", () => {
    const campaign = source("app/projects/[projectId]/campaigns/page.tsx");
    const form = source("components/campaign-draft-form.tsx");
    expect(campaign).toContain("GROW · CAMPAIGNS");
    expect(campaign).not.toContain("SITEREFINER");
    expect(form).toContain("Tell Ziepher what you want to promote");
    expect(form).not.toContain("Tell SiteRefiner");
  });

  it("includes all launch field states in the active-job dashboard count", () => {
    const dashboard = source("app/operate/page.tsx");
    for (const status of ["scheduled", "en_route", "arrived", "active", "weather_delay", "paused"]) {
      expect(dashboard).toContain(`\"${status}\"`);
    }
    expect(dashboard).toContain('href="/operate/growth"');
  });
});
