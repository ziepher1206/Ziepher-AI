import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Tree Service launch readiness gate", () => {
  it("keeps all seven phase guard suites in CI scope", () => {
    const phase1 = source("tests/operate-phase1-foundation.test.ts");
    const phase2 = source("tests/tree-service-phase2-lead-intake.test.ts");
    const phase3 = source("tests/tree-service-phase3-estimates-scheduling.test.ts");
    const phase4 = source("tests/tree-service-phase4-jobs-crew.test.ts");
    const phase5 = source("tests/operate-phase5-invoices-stripe.test.ts");
    const phase6 = source("tests/operate-phase6-growth.test.ts");
    const phase7 = source("tests/operate-phase7-assistant.test.ts");

    expect(phase1).toContain("row level security");
    expect(phase2).toContain("operate_lead_intake_tokens");
    expect(phase3).toContain("appointments_no_active_user_overlap");
    expect(phase4).toContain("completion");
    expect(phase5).toContain("Live Stripe events are disabled");
    expect(phase6).toContain("does not automatically");
    expect(phase7).toContain("costs no AI tokens");
  });

  it("keeps the full owner workflow visible from one Operate dashboard", () => {
    const dashboard = source("app/operate/page.tsx");
    for (const href of [
      "/operate/leads",
      "/operate/estimates",
      "/operate/calendar",
      "/operate/invoices",
      "/operate/growth",
      "/operate/assistant"
    ]) {
      expect(dashboard).toContain(href);
    }
    expect(dashboard).toContain("Lead → Estimate → Job");
  });

  it("keeps the critical workflow routes present", () => {
    source("app/api/operate/leads/[leadId]/schedule-estimate/route.ts");
    source("app/operate/estimates/[estimateId]/page.tsx");
    source("app/operate/jobs/[jobId]/page.tsx");
    source("app/operate/invoices/[invoiceId]/page.tsx");
    source("app/operate/growth/page.tsx");
    source("app/operate/assistant/page.tsx");
  });

  it("keeps launch CI running tests, builds, and dependency audit", () => {
    const ci = source(".github/workflows/ci.yml");
    expect(ci).toContain("npm test");
    expect(ci).toContain("npm run build");
    expect(ci).toContain("npm audit --audit-level=moderate");
  });

  it("keeps live payment and autonomous assistant actions blocked", () => {
    const stripeSafety = source("lib/stripe/operate-payment-config.ts");
    const stripeEvents = source("lib/stripe/operate-payment-events.ts");
    const assistant = source("app/operate/assistant/page.tsx");

    expect(stripeSafety).toContain("sk_test_");
    expect(stripeEvents).toContain("Live Stripe events are disabled");
    expect(assistant).toContain("read-only and deterministic");
    expect(assistant).toContain("require explicit approval");
  });
});
