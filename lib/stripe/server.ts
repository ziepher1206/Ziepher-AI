import Stripe from "stripe";

export function getStripe() {
  if (process.env.STRIPE_ENABLED !== "true") {
    throw new Error(
      "Stripe is disabled. Complete and verify the core application before enabling payments."
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is missing.");

  return new Stripe(secretKey);
}
