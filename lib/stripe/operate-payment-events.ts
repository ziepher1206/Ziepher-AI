import type Stripe from "stripe";

export const OPERATE_PAYMENT_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.expired",
  "charge.refunded"
] as const;

export type OperatePaymentEventType = typeof OPERATE_PAYMENT_EVENT_TYPES[number];

export function isOperatePaymentEventType(value: string): value is OperatePaymentEventType {
  return (OPERATE_PAYMENT_EVENT_TYPES as readonly string[]).includes(value);
}

export function assertOperateTestEvent(event: Pick<Stripe.Event, "livemode">) {
  if (event.livemode) {
    throw new Error("Live Stripe events are disabled for Ziepher Operate.");
  }
}

export function checkoutSessionRepresentsPayment(
  session: Pick<Stripe.Checkout.Session, "payment_status">
) {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

export function assertPositivePaidAmount(amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Completed Checkout Session has no paid amount.");
  }
  return amountCents;
}

export function operateCheckoutIdempotencyKey(input: {
  workspaceId: string;
  invoiceId: string;
  milestoneId?: string | null;
  amountCents: number;
  connectedAccountId: string;
}) {
  return [
    "operate-checkout",
    input.workspaceId,
    input.invoiceId,
    input.milestoneId ?? "full",
    String(input.amountCents),
    input.connectedAccountId
  ].join(":");
}
