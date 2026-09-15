import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/operate/pilot/page.tsx", "utf8");

describe("Tree Service controlled-pilot readiness dashboard", () => {
  it("requires authentication and scopes all evidence to the signed-in workspace", () => {
    expect(page).toContain('redirect("/auth/sign-in")');
    expect(page).toContain("supabase.auth.getUser()");
    expect(page).toContain('"ensure_personal_workspace"');
    expect(page).toContain('.eq("workspace_id", workspaceId)');
  });

  it("reads workflow evidence without taking customer-facing or payment actions", () => {
    for (const table of [
      "leads",
      "estimates",
      "jobs",
      "invoices",
      "payment_transactions",
      "operate_review_requests",
      "operate_automation_events",
    ]) {
      expect(page).toContain(`from("${table}")`);
    }
    expect(page).not.toContain("getStripe(");
    expect(page).not.toContain("fetch(\"/api/payments");
    expect(page).not.toContain("send_customer_message");
    expect(page).not.toContain("publish_marketing");
  });

  it("never equates database evidence, CI, or Vercel preview readiness with launch approval", () => {
    expect(page).toContain("Observed ≠ verified");
    expect(page).toContain("They are intentionally not converted into a launch-ready score");
    expect(page).toContain("Manual verification required");
    expect(page).toContain("Broad production-customer launch remains unapproved");
    expect(page).toContain("CI passing means repository checks passed");
    expect(page).toContain("Neither result proves tenant isolation");
  });

  it("keeps the real controlled-pilot verification gates visible", () => {
    expect(page).toContain("Authenticated end-to-end pilot run");
    expect(page).toContain("Two-workspace tenant-isolation test");
    expect(page).toContain("Stripe test webhook + idempotency exercise");
    expect(page).toContain("Database backup and restore drill");
    expect(page).toContain("Vercel rollback drill");
    expect(page).toContain("Human security review");
    expect(page).toContain("Customer-facing legal review");
    expect(page).toContain("Controlled Tree Service pilot completion");
  });
});
