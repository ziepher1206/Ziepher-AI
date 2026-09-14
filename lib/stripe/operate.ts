import "server-only";
import Stripe from "stripe";
import {
  applicationFeeCents,
  operatePlatformFeeBps,
  operateStripeTestEnabled,
  requireOperateStripeTestKey
} from "@/lib/stripe/operate-payment-config";
import { assertZLifeLiveProviderAllowed } from "@/lib/community/provider-adapters";

export { applicationFeeCents, operatePlatformFeeBps, operateStripeTestEnabled };

export function getOperateStripeTestClient() {
  assertZLifeLiveProviderAllowed("payments");
  return new Stripe(requireOperateStripeTestKey());
}
