import { describe, expect, it } from "vitest";
import {
  applicationFeeCents,
  operatePlatformFeeBps,
  operateStripeTestEnabled,
  requireOperateStripeTestKey
} from "../lib/stripe/operate-payment-config";
import {
  assertOperateTestEvent,
  assertPositivePaidAmount,
  checkoutSessionRepresentsPayment,
  isOperatePaymentEventType,
  operateCheckoutIdempotencyKey
} from "../lib/stripe/operate-payment-events";

describe("Ziepher Operate Stripe safety locks", () => {
  it("keeps Stripe disabled unless explicitly enabled", () => {
    expect(operateStripeTestEnabled({})).toBe(false);
    expect(() => requireOperateStripeTestKey({})).toThrow(/test mode is disabled/i);
  });

  it("rejects live Stripe secret keys even when test mode is enabled", () => {
    expect(() => requireOperateStripeTestKey({
      ZIEPHER_OPERATE_STRIPE_TEST_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_live_forbidden"
    })).toThrow(/test keys only/i);
  });

  it("accepts only a test secret key when test mode is enabled", () => {
    expect(requireOperateStripeTestKey({
      ZIEPHER_OPERATE_STRIPE_TEST_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_test_example"
    })).toBe("sk_test_example");
  });

  it("rejects live webhook events", () => {
    expect(() => assertOperateTestEvent({ livemode: true })).toThrow(/live Stripe events are disabled/i);
    expect(() => assertOperateTestEvent({ livemode: false })).not.toThrow();
  });

  it("only treats paid and no-payment-required sessions as settled payment candidates", () => {
    expect(checkoutSessionRepresentsPayment({ payment_status: "paid" })).toBe(true);
    expect(checkoutSessionRepresentsPayment({ payment_status: "no_payment_required" })).toBe(true);
    expect(checkoutSessionRepresentsPayment({ payment_status: "unpaid" })).toBe(false);
  });

  it("rejects zero, negative, fractional, and invalid paid amounts", () => {
    expect(() => assertPositivePaidAmount(0)).toThrow();
    expect(() => assertPositivePaidAmount(-1)).toThrow();
    expect(() => assertPositivePaidAmount(10.5)).toThrow();
    expect(assertPositivePaidAmount(5000)).toBe(5000);
  });

  it("recognizes only handled payment webhook event types", () => {
    expect(isOperatePaymentEventType("checkout.session.completed")).toBe(true);
    expect(isOperatePaymentEventType("checkout.session.expired")).toBe(true);
    expect(isOperatePaymentEventType("charge.refunded")).toBe(true);
    expect(isOperatePaymentEventType("charge.succeeded")).toBe(false);
  });

  it("builds stable checkout idempotency keys and separates milestones/amount changes", () => {
    const base = {
      workspaceId: "11111111-1111-4111-8111-111111111111",
      invoiceId: "22222222-2222-4222-8222-222222222222",
      amountCents: 25000,
      connectedAccountId: "acct_test"
    };
    const full1 = operateCheckoutIdempotencyKey(base);
    const full2 = operateCheckoutIdempotencyKey(base);
    const milestone = operateCheckoutIdempotencyKey({ ...base, milestoneId: "33333333-3333-4333-8333-333333333333" });
    const changedAmount = operateCheckoutIdempotencyKey({ ...base, amountCents: 26000 });
    expect(full1).toBe(full2);
    expect(full1).not.toBe(milestone);
    expect(full1).not.toBe(changedAmount);
  });

  it("defaults the platform fee to zero and caps configuration at 10 percent", () => {
    expect(operatePlatformFeeBps({})).toBe(0);
    expect(applicationFeeCents(10000, {})).toBe(0);

    const feeEnv = { ZIEPHER_OPERATE_PLATFORM_FEE_BPS: "250" };
    expect(operatePlatformFeeBps(feeEnv)).toBe(250);
    expect(applicationFeeCents(10000, feeEnv)).toBe(250);

    expect(() => operatePlatformFeeBps({ ZIEPHER_OPERATE_PLATFORM_FEE_BPS: "1001" })).toThrow(/between 0 and 1000/i);
  });
});
