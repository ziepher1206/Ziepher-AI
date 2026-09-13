import "server-only";
import Stripe from "stripe";

export function operateStripeTestEnabled() {
  return process.env.ZIEPHER_OPERATE_STRIPE_TEST_ENABLED === "true";
}

export function getOperateStripeTestClient() {
  if (!operateStripeTestEnabled()) {
    throw new Error("Ziepher Operate Stripe test mode is disabled.");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is missing.");
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Ziepher Operate currently accepts Stripe test keys only.");
  }

  return new Stripe(secretKey);
}

export function operatePlatformFeeBps() {
  const raw = process.env.ZIEPHER_OPERATE_PLATFORM_FEE_BPS;
  if (!raw) return 0;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0 || value > 1000) {
    throw new Error("ZIEPHER_OPERATE_PLATFORM_FEE_BPS must be between 0 and 1000.");
  }
  return value;
}

export function applicationFeeCents(amountCents: number) {
  return Math.max(0, Math.round((amountCents * operatePlatformFeeBps()) / 10_000));
}
