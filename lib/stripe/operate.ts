import "server-only";
import Stripe from "stripe";
import {
  applicationFeeCents,
  operatePlatformFeeBps,
  operateStripeTestEnabled,
  requireOperateStripeTestKey
} from "@/lib/stripe/operate-payment-config";

export { applicationFeeCents, operatePlatformFeeBps, operateStripeTestEnabled };

export function getOperateStripeTestClient() {
  return new Stripe(requireOperateStripeTestKey());
}
