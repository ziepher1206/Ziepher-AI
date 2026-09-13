import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperateStripeTestClient } from "@/lib/stripe/operate";
import {
  assertOperateTestEvent,
  assertPositivePaidAmount,
  checkoutSessionRepresentsPayment
} from "@/lib/stripe/operate-payment-events";

export const runtime = "nodejs";

function webhookSecret() {
  const value = process.env.ZIEPHER_OPERATE_STRIPE_WEBHOOK_SECRET;
  if (!value) throw new Error("ZIEPHER_OPERATE_STRIPE_WEBHOOK_SECRET is missing.");
  return value;
}

function objectId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function claimEvent(event: Stripe.Event) {
  const admin = createAdminClient();
  const { error } = await admin.from("payment_provider_events").insert({
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    livemode: false,
    processed: false
  });

  if (!error) return { admin, duplicate: false, processed: false };
  if (error.code !== "23505") throw error;

  const { data: existing, error: existingError } = await admin
    .from("payment_provider_events")
    .select("processed")
    .eq("provider", "stripe")
    .eq("provider_event_id", event.id)
    .single();
  if (existingError) throw existingError;
  return { admin, duplicate: true, processed: existing.processed === true };
}

export async function POST(request: Request) {
  let event: Stripe.Event | null = null;
  let admin: ReturnType<typeof createAdminClient> | null = null;

  try {
    const stripe = getOperateStripeTestClient();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    }

    try {
      event = stripe.webhooks.constructEvent(
        await request.text(),
        signature,
        webhookSecret()
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid webhook." },
        { status: 400 }
      );
    }

    try {
      assertOperateTestEvent(event);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Live Stripe events are disabled." },
        { status: 400 }
      );
    }

    const claim = await claimEvent(event);
    admin = claim.admin;
    if (claim.duplicate && claim.processed) {
      return NextResponse.json({ received: true, duplicate: true, testMode: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (checkoutSessionRepresentsPayment(session)) {
        const paymentIntentId = objectId(session.payment_intent);
        let chargeId: string | null = null;
        let amountCents = session.amount_total ?? 0;

        if (paymentIntentId) {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ["latest_charge"]
          });
          amountCents = paymentIntent.amount_received || amountCents;
          chargeId = objectId(paymentIntent.latest_charge);
        }

        assertPositivePaidAmount(amountCents);

        const { error } = await admin.rpc("settle_operate_checkout_payment", {
          p_provider_event_id: event.id,
          p_checkout_session_id: session.id,
          p_payment_intent_id: paymentIntentId,
          p_charge_id: chargeId,
          p_amount_cents: amountCents
        });
        if (error) throw error;
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { error } = await admin.rpc("cancel_operate_checkout_payment", {
        p_provider_event_id: event.id,
        p_checkout_session_id: session.id
      });
      if (error && !error.message.includes("not found")) throw error;
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const { error } = await admin.rpc("refund_operate_payment", {
        p_provider_event_id: event.id,
        p_charge_id: charge.id,
        p_refunded_cents: charge.amount_refunded
      });
      if (error) throw error;
    }

    const { error: completeError } = await admin
      .from("payment_provider_events")
      .update({
        processed: true,
        processing_error: null,
        processed_at: new Date().toISOString()
      })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);
    if (completeError) throw completeError;

    return NextResponse.json({ received: true, testMode: true });
  } catch (error) {
    if (admin && event) {
      await admin
        .from("payment_provider_events")
        .update({
          processed: false,
          processing_error: error instanceof Error ? error.message.slice(0, 5000) : String(error),
          processed_at: null
        })
        .eq("provider", "stripe")
        .eq("provider_event_id", event.id);
    }

    return NextResponse.json(
      { error: "Ziepher Operate payment webhook processing failed." },
      { status: 500 }
    );
  }
}
