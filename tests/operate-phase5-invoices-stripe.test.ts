import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Tree Service Phase 5 invoice and Stripe guards", () => {
  it("keeps payment-plan management admin-only and exact-total reconciled", () => {
    const route = source("app/api/workspaces/[workspaceId]/invoices/[invoiceId]/milestones/route.ts");
    expect(route).toContain("requireWorkspaceAdmin(workspaceId)");
    expect(route).toContain("sum !== invoice.total_cents");
    expect(route).toContain("Payment plan does not reconcile to the invoice total");
    expect(route).toContain("Create the payment plan before collecting any invoice payment");
  });

  it("does not allow canceling a payment plan after money moved", () => {
    const route = source("app/api/workspaces/[workspaceId]/invoices/[invoiceId]/milestones/route.ts");
    expect(route).toContain('row.status === "paid" || row.status === "refunded"');
    expect(route).toContain("A payment plan cannot be canceled after a milestone has been paid");
  });

  it("routes each stage-billing payment through a specific milestone checkout", () => {
    const checkout = source("components/operate-invoice-checkout.tsx");
    const plan = source("components/operate-invoice-payment-plan.tsx");
    expect(checkout).toContain("milestoneId");
    expect(checkout).toContain("Test mode only");
    expect(plan).toContain("milestoneId={item.id}");
    expect(plan).toContain("Deposit & installments");
  });

  it("shows paid, remaining, next due, and payment/refund history", () => {
    const page = source("app/operate/invoices/[invoiceId]/page.tsx");
    const plan = source("components/operate-invoice-payment-plan.tsx");
    expect(plan).toContain("Plan remaining");
    expect(plan).toContain("Next due");
    expect(page).toContain("Payment history");
    expect(page).toContain("refunded_cents");
  });

  it("retains the hard live-Stripe rejection path", () => {
    const safety = source("lib/stripe/operate-payment-config.ts");
    const events = source("lib/stripe/operate-payment-events.ts");
    expect(safety).toContain("sk_test_");
    expect(events).toContain("Live Stripe events are disabled");
  });
});
