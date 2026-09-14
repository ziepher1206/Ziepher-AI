import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDeterministicSiteAnalysis } from "../lib/ai/site-analysis";
import type { WebsiteHealth } from "../lib/site-scan";

const route = readFileSync("app/api/projects/[projectId]/site-analysis/route.ts", "utf8");
const page = readFileSync("app/projects/[projectId]/page.tsx", "utf8");
const controls = readFileSync("components/site-analysis-controls.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20260914202500_project_site_analysis_state.sql", "utf8");

describe("detailed website analysis", () => {
  it("builds a useful zero-cost report from scan evidence", () => {
    const health: WebsiteHealth = {
      score: 78,
      scannedUrl: "https://example.com/",
      statusCode: 200,
      title: "Example Tree Service",
      description: "Example description long enough for the scan check to pass safely.",
      h1Count: 1,
      checks: [
        { key: "https", label: "Secure HTTPS", passed: true, detail: "Homepage uses HTTPS." },
        { key: "structured-data", label: "Structured data", passed: false, detail: "No JSON-LD structured data detected." },
        { key: "conversion", label: "Conversion path", passed: false, detail: "No form or phone CTA detected on the homepage." }
      ],
      recommendations: [
        "Add appropriate structured data for the business and services.",
        "Make the primary call, estimate, booking, or contact action obvious on the homepage."
      ]
    };

    const report = createDeterministicSiteAnalysis(health);
    expect(report.summary).toContain("78/100");
    expect(report.strengths[0]).toContain("Secure HTTPS");
    expect(report.priorities).toHaveLength(2);
    expect(report.priorities[0]?.category).toBe("seo");
    expect(report.priorities[1]?.category).toBe("conversion");
  });

  it("keeps live provider analysis behind explicit approval, owner gate, and monthly budget", () => {
    expect(route).toContain('mode: z.enum(["deterministic", "live"])');
    expect(route).toContain("Explicit paid AI confirmation is required");
    expect(route).toContain('SITE_REFINER_PAID_AI_ENABLED !== "true"');
    expect(route).toContain("assertAIProviderBudget(spentThisMonth)");
    expect(route).toContain('operation: "site_deep_analysis"');
    expect(route).toContain("customer_usage_usd: 0");
  });

  it("persists analysis through an authenticated workspace-scoped RPC", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("auth.uid() is null");
    expect(migration).toContain("is_workspace_member(v_project.workspace_id)");
    expect(migration).toContain("'deepAnalysis'");
    expect(migration).toContain("revoke all on function public.set_project_site_analysis");
    expect(migration).toContain("grant execute on function public.set_project_site_analysis");
  });

  it("surfaces scan checks before unrelated workspace cards and exposes analysis controls", () => {
    expect(page.indexOf("What the scanner found")).toBeGreaterThan(-1);
    expect(page.indexOf("What the scanner found")).toBeLessThan(page.indexOf("Change pipeline"));
    expect(page).toContain("Detailed website analysis");
    expect(page).toContain("SiteAnalysisControls");
    expect(controls).toContain("Build detailed report — free");
    expect(controls).toContain("Run deep AI analysis");
  });
});
