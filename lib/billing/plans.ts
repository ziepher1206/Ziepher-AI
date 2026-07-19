export const billingPlans = {
  explore: {
    name: "Explore",
    monthlyCredits: 0,
    description: "Free planning and a small introductory build allowance."
  },
  builder: {
    name: "Builder",
    monthlyCredits: 400,
    description: "Private projects, source export, deployment, and regular building."
  },
  pro: {
    name: "Pro",
    monthlyCredits: 1000,
    description: "Higher limits, stronger routing, advanced tests, and priority builds."
  }
} as const;

export type PaidPlan = "builder" | "pro";
export type BillingInterval = "monthly" | "annual";

export function priceIdFor(plan: PaidPlan, interval: BillingInterval) {
  const key =
    plan === "builder"
      ? interval === "monthly"
        ? "STRIPE_BUILDER_PRICE_ID"
        : "STRIPE_BUILDER_ANNUAL_PRICE_ID"
      : interval === "monthly"
        ? "STRIPE_PRO_PRICE_ID"
        : "STRIPE_PRO_ANNUAL_PRICE_ID";

  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured.`);
  return value;
}

export function creditsForPlan(
  plan: string,
  interval: BillingInterval | string = "monthly"
) {
  const multiplier = interval === "annual" ? 12 : 1;
  if (plan === "builder") {
    return billingPlans.builder.monthlyCredits * multiplier;
  }
  if (plan === "pro") {
    return billingPlans.pro.monthlyCredits * multiplier;
  }
  return 0;
}
