import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const invoicing = read("supabase/migrations/20260913144500_ziepher_operate_invoicing.sql");
const settlement = read("supabase/migrations/20260913153500_ziepher_operate_payment_settlement.sql");

describe("Tree Service invoice and payment settlement contract", () => {
  it("keeps invoice, milestone, and transaction relationships workspace-scoped", () => {
    for (const constraint of [
      "invoices_customer_workspace_fk",
      "invoices_property_workspace_fk",
      "invoices_job_workspace_fk",
      "invoice_milestones_invoice_workspace_fk",
      "invoice_milestones_job_workspace_fk",
      "payment_transactions_invoice_workspace_fk",
      "payment_transactions_milestone_workspace_fk",
    ]) {
      expect(invoicing).toContain(`constraint ${constraint}`);
    }
  });

  it("keeps provider transaction writes server-mediated", () => {
    expect(invoicing).toContain("revoke insert, update, delete on public.workspace_payment_accounts, public.payment_transactions from authenticated");
    expect(invoicing).toContain("revoke all on public.payment_provider_events from authenticated");
    expect(settlement).toContain("from public, anon, authenticated");
    expect(settlement).toContain("to service_role");
  });

  it("verifies the provider amount before settling a payment", () => {
    expect(settlement).toContain("if p_amount_cents <= 0 then");
    expect(settlement).toContain("if v_tx.amount_cents <> p_amount_cents then");
    expect(settlement).toContain("Provider amount does not match authoritative transaction amount");
  });

  it("makes repeated successful settlement non-destructive", () => {
    expect(settlement).toContain("if v_tx.status not in ('succeeded', 'partially_refunded', 'refunded') then");
    expect(settlement).toContain("succeeded_at = coalesce(succeeded_at, now())");
    expect(settlement).toContain("provider_payment_intent_id = coalesce(provider_payment_intent_id, p_payment_intent_id)");
  });

  it("recomputes invoice state from net paid value after settlement and refunds", () => {
    expect(settlement).toContain("sum(greatest(amount_cents - refunded_cents, 0))");
    expect(settlement).toContain("when v_net_paid > 0 then 'partial'");
    expect(settlement).toContain("then 'paid'::public.operate_invoice_status");
    expect(settlement.match(/perform public\.recompute_operate_invoice_payment_state/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("bounds refunds and preserves full-versus-partial refund state", () => {
    expect(settlement).toContain("p_refunded_cents < 0 or p_refunded_cents > v_tx.amount_cents");
    expect(settlement).toContain("when p_refunded_cents >= v_tx.amount_cents then 'refunded'");
    expect(settlement).toContain("else 'partially_refunded'");
  });

  it("only cancels pending checkout transactions", () => {
    expect(settlement).toContain("if v_tx.status = 'pending' then");
    expect(settlement).toContain("set status = 'canceled'");
  });
});
