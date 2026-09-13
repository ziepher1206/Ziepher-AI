type PaymentEnv = Record<string, string | undefined>;

export function operateStripeTestEnabled(env: PaymentEnv = process.env) {
  return env.ZIEPHER_OPERATE_STRIPE_TEST_ENABLED === "true";
}

export function requireOperateStripeTestKey(env: PaymentEnv = process.env) {
  if (!operateStripeTestEnabled(env)) {
    throw new Error("Ziepher Operate Stripe test mode is disabled.");
  }
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is missing.");
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Ziepher Operate currently accepts Stripe test keys only.");
  }
  return secretKey;
}

export function operatePlatformFeeBps(env: PaymentEnv = process.env) {
  const raw = env.ZIEPHER_OPERATE_PLATFORM_FEE_BPS;
  if (!raw) return 0;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0 || value > 1000) {
    throw new Error("ZIEPHER_OPERATE_PLATFORM_FEE_BPS must be between 0 and 1000.");
  }
  return value;
}

export function applicationFeeCents(amountCents: number, env: PaymentEnv = process.env) {
  return Math.max(0, Math.round((amountCents * operatePlatformFeeBps(env)) / 10_000));
}
