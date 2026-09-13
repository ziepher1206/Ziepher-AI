import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperateStripeTestClient } from "@/lib/stripe/operate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminClient = ReturnType<typeof createAdminClient>;

async function recordEvent(admin: AdminClient, event: Stripe.Event) {
  const { data: existing, error: existingError } = await admin
    .from("payment_provider_events")
    .select("id,processed")
    .eq("provider", "stripe")
    .eq("provider_event_id", event.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.processed) return { alreadyProcessed: true, rowId: existing.id as string };

  if (existing) {
    const { error } = await admin
      .from("payment_provider_events")
      .update({ event_type: event.type, livemode: event.livemode, processing_error: null })
      .eq("id", existing.id);
    if (error) throw error;
    return { alreadyProcessed: false, rowId: existing.id as string };
  }

  const { data, error } = await admin
    .from("payment_provider_events")
    .insert({
      provider: "stripe",
      provider_event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      processed: false
    })
    .select("id")
    .single();
  if (error) throw error;
  return { alreadyProcessed: false, rowId: data.id as string };
}

async function finishEvent(admin: AdminClient, rowId: string) {
  const { error } = await admin
    .from("payment_provider_events")
    .update({ processed: true, processed_at: new Date().toISOString(), processing_error: null })
    .eq("id", rowId);
  if (error) throw error;
}

async function failEvent(admin: AdminClient, rowId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await admin
    .from("payment_provider_events")
    .update({ processed: false, processing_error: message.slice(0, 2000) })
    .eq("id", rowId);
}

async function reconcileInvoice(admin: AdminClient, workspaceId: string, invoiceId: string) {
  const { data: invoice, error: invoiceError } = await admin
    .from("invoices")
    .select("id,total_cents,status")
    .eq("id", invoiceId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (invoiceError) throw invoiceError;
  if (!invoice) throw new Error("Webhook invoice not found.");

  const { data: transactions, error: transactionsError } = await admin
    .from("payment_transactions")
    .select("amount_cents,refunded_cents,status")
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .in("status", ["succeeded", "partially_refunded", "refunded"]);
  if (transactionsError) throw transactionsError;

  const paidCents = Math.min(
    invoice.total_cents,
    (transactions ?? []).reduce((sum, row) => {
      const net = Math.max(0, Number(row.amount_cents) - Number(row.refunded_cents ?? 0));
      return sum + net;
    }, 0)
  );

  let status = invoice.status as string;
  if (paidCents >= invoice.total_cents && invoice.total_cents > 0) status = "paid";
  else if (paidCents > 0) status = "partial";
  else if (status === "paid" || status === "partial") status = "sent";

  const { error } = await admin
    .from("invoices")
    .update({
      paid_cents: paidCents,
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null
    })
    .eq("id", invoiceId)
    .eq("workspace_id", workspaceId);
  if (error) throw error;
}

async function markCheckoutSucceeded(admin: AdminClient, stripe: Stripe, session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId;
  const invoiceId = session.metadata?.invoiceId;
  const milestoneId = session.metadata?.milestoneId ?? null;
  if (!workspaceId || !invoiceId) throw new Error("Checkout session is missing Ziepher metadata.");
  if (session.payment_status !== "paid") return;

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  let chargeId: string | null = null;

  if (paymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    chargeId = typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id ?? null;
  }

  const { data: transaction, error: txLookupError } = await admin
    .from("payment_transactions")
    .select("id,amount_cents")
    .eq("provider", "stripe")
    .eq("provider_checkout_session_id", session.id)
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (txLookupError) throw txLookupError;
  if (!transaction) throw new Error("Pending Ziepher payment transaction not found.");

  const amountCents = session.amount_total ?? Number(transaction.amount_cents);
  if (amountCents !== Number(transaction.amount_cents)) {
    throw new Error("Stripe payment amount does not match the server-authoritative transaction amount.");
  }

  const { error: txError } = await admin
    .from("payment_transactions")
    .update({
      provider_payment_intent_id: paymentIntentId,
      provider_charge_id: chargeId,
      status: "succeeded",
      succeeded_at: new Date().toISOString(),
      failed_at: null
    })
    .eq("id", transaction.id);
  if (txError) throw txError;

  if (milestoneId) {
    const { error: milestoneError } = await admin
      .from("invoice_milestones")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        provider_checkout_session_id: session.id,
        provider_payment_intent_id: paymentIntentId
      })
      .eq("id", milestoneId)
      .eq("workspace_id", workspaceId)
      .eq("invoice_id", invoiceId);
    if (milestoneError) throw milestoneError;
  }

  await reconcileInvoice(admin, workspaceId, invoiceId);
}

async function markCheckoutFailed(admin: AdminClient, session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId;
  const invoiceId = session.metadata?.invoiceId;
  if (!workspaceId || !invoiceId) return;

  const { error } = await admin
    .from("payment_transactions")
    .update({ status: "failed", failed_at: new Date().toISOString() })
    .eq("provider", "stripe")
    .eq("provider_checkout_session_id", session.id)
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .eq("status", "pending");
  if (error) throw error;
}

async function markPaymentIntentFailed(admin: AdminClient, intent: Stripe.PaymentIntent) {
  const workspaceId = intent.metadata?.workspaceId;
  const invoiceId = intent.metadata?.invoiceId;
  if (!workspaceId || !invoiceId) return;

  const { error } = await admin
    .from("payment_transactions")
    .update({
      provider_payment_intent_id: intent.id,
      status: "failed",
      failed_at: new Date().toISOString(),
      metadata: {
        testMode: true,
        failureMessage: intent.last_payment_error?.message ?? null
      }
    })
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .eq("status", "pending");
  if (error) throw error;
}

async function markChargeRefunded(admin: AdminClient, charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;

  let query = admin
    .from("payment_transactions")
    .select("id,workspace_id,invoice_id,milestone_id,amount_cents")
    .eq("provider", "stripe");
  query = paymentIntentId
    ? query.eq("provider_payment_intent_id", paymentIntentId)
    : query.eq("provider_charge_id", charge.id);

  const { data: transaction, error: txError } = await query.maybeSingle();
  if (txError) throw txError;
  if (!transaction) return;

  const refundedCents = Math.min(Number(transaction.amount_cents), charge.amount_refunded);
  const fullyRefunded = refundedCents >= Number(transaction.amount_cents);

  const { error: updateError } = await admin
    .from("payment_transactions")
    .update({
      provider_charge_id: charge.id,
      refunded_cents: refundedCents,
      status: fullyRefunded ? "refunded" : "partially_refunded",
      refunded_at: refundedCents > 0 ? new Date().toISOString() : null
    })
    .eq("id", transaction.id);
  if (updateError) throw updateError;

  if (fullyRefunded && transaction.milestone_id) {
    const { error: milestoneError } = await admin
      .from("invoice_milestones")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", transaction.milestone_id)
      .eq("workspace_id", transaction.workspace_id);
    if (milestoneError) throw milestoneError;
  }

  await reconcileInvoice(admin, transaction.workspace_id, transaction.invoice_id);
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  let eventRowId: string | null = null;

  try {
    const stripe = getOperateStripeTestClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is missing.");

    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    if (event.livemode) {
      return NextResponse.json({ error: "Live Stripe events are disabled for Ziepher Operate." }, { status: 403 });
    }

    const recorded = await recordEvent(admin, event);
    eventRowId = recorded.rowId;
    if (recorded.alreadyProcessed) return NextResponse.json({ received: true, duplicate: true });

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await markCheckoutSucceeded(admin, stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        await markCheckoutFailed(admin, event.data.object as Stripe.Checkout.Session);
        break;
      case "payment_intent.payment_failed":
        await markPaymentIntentFailed(admin, event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await markChargeRefunded(admin, event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }

    await finishEvent(admin, eventRowId);
    return NextResponse.json({ received: true, type: event.type, testMode: true });
  } catch (error) {
    if (eventRowId) await failEvent(admin, eventRowId, error);
    const message = error instanceof Error ? error.message : "Stripe webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
