import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireServerEnv } from "@/lib/env";
import { creditsForPlan } from "@/lib/billing/plans";

export const runtime = "nodejs";

type SubscriptionShape = {
  id: string;
  customer: string | { id: string };
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
};

function customerId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      requireServerEnv("STRIPE_WEBHOOK_SECRET")
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error: claimError } = await admin
    .from("billing_webhook_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      status: "processing"
    });

  if (claimError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId;
      const plan = session.metadata?.plan ?? "explore";
      const interval = session.metadata?.interval ?? "monthly";
      const paid =
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required";

      if (workspaceId) {
        const { error } = await admin.from("subscriptions").upsert({
          workspace_id: workspaceId,
          stripe_customer_id: customerId(session.customer),
          stripe_subscription_id:
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id,
          plan,
          billing_interval: interval,
          status: paid ? "active" : "pending",
          updated_at: new Date().toISOString()
        });
        if (error) throw error;

        if (paid) {
          const credits = creditsForPlan(plan, interval);
          const invoiceId =
            typeof session.invoice === "string"
              ? session.invoice
              : session.invoice?.id;
          if (credits > 0) {
            const { error: grantError } = await admin.rpc(
              "grant_workspace_credits",
              {
                p_workspace_id: workspaceId,
                p_amount: credits,
                p_reason: `${interval === "annual" ? "Annual" : "Monthly"} ${plan} build-credit grant`,
                p_idempotency_key: invoiceId
                  ? `stripe-invoice:${invoiceId}`
                  : `stripe-checkout:${session.id}`
              }
            );
            if (grantError) throw grantError;
          }
        }
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription =
        event.data.object as unknown as SubscriptionShape;
      const workspaceId = subscription.metadata?.workspaceId;
      const plan = subscription.metadata?.plan ?? "explore";
      const interval = subscription.metadata?.interval ?? "monthly";
      const customer = customerId(subscription.customer);

      if (workspaceId) {
        const { error } = await admin.from("subscriptions").upsert({
          workspace_id: workspaceId,
          stripe_customer_id: customer,
          stripe_subscription_id: subscription.id,
          plan,
          billing_interval: interval,
          status: subscription.status,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end:
            subscription.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
      } else if (customer) {
        const { error } = await admin
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end:
              subscription.cancel_at_period_end ?? false,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_customer_id", customer);
        if (error) throw error;
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as unknown as {
        id: string;
        customer: string | { id: string } | null;
      };
      const customer = customerId(invoice.customer);
      if (customer) {
        const { data: subscription, error } = await admin
          .from("subscriptions")
          .select("workspace_id,plan,billing_interval")
          .eq("stripe_customer_id", customer)
          .single();
        if (error) throw error;

        const credits = creditsForPlan(
          subscription.plan,
          subscription.billing_interval
        );
        if (credits > 0) {
          const { error: grantError } = await admin.rpc(
            "grant_workspace_credits",
            {
              p_workspace_id: subscription.workspace_id,
              p_amount: credits,
              p_reason: `Monthly ${subscription.plan} build-credit grant`,
              p_idempotency_key: `stripe-invoice:${invoice.id}`
            }
          );
          if (grantError) throw grantError;
        }
      }
    }


    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as unknown as {
        customer: string | { id: string } | null;
      };
      const customer = customerId(invoice.customer);
      if (customer) {
        const { error } = await admin
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString()
          })
          .eq("stripe_customer_id", customer);
        if (error) throw error;
      }
    }

    await admin
      .from("billing_webhook_events")
      .update({
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    await admin
      .from("billing_webhook_events")
      .update({
        status: "failed",
        failure_message:
          error instanceof Error ? error.message.slice(0, 5000) : String(error),
        completed_at: new Date().toISOString()
      })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
