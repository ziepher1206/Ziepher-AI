import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireWorkspaceMember } from "@/lib/operate/workspace-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationFeeCents, getOperateStripeTestClient } from "@/lib/stripe/operate";
import { operateCheckoutIdempotencyKey } from "@/lib/stripe/operate-payment-events";

export const runtime = "nodejs";
type Context = { params: Promise<{ workspaceId: string; invoiceId: string }> };

const idSchema = z.string().uuid();
const bodySchema = z.object({
  milestoneId: z.string().uuid().optional(),
  origin: z.string().url().optional()
}).default({});

export async function POST(request: Request, context: Context) {
  try {
    const params = await context.params;
    const workspaceId = idSchema.parse(params.workspaceId);
    const invoiceId = idSchema.parse(params.invoiceId);
    const input = bodySchema.parse(await request.json().catch(() => ({})));
    await requireWorkspaceMember(workspaceId);

    const admin = createAdminClient();
    const stripe = getOperateStripeTestClient();

    const { data: invoice, error: invoiceError } = await admin
      .from("invoices")
      .select("id,workspace_id,customer_id,job_id,invoice_number,status,currency,total_cents,paid_cents,balance_due_cents")
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Invoice not found.");
    if (["paid", "void"].includes(invoice.status)) {
      throw new Error(invoice.status === "paid" ? "This invoice has already been paid." : "This invoice is void.");
    }

    let milestone: {
      id: string;
      amount_cents: number;
      label: string;
      status: string;
      provider_checkout_session_id: string | null;
    } | null = null;
    let amountCents = invoice.balance_due_cents;
    let description = `Invoice ${invoice.invoice_number}`;

    if (input.milestoneId) {
      const { data, error } = await admin
        .from("invoice_milestones")
        .select("id,amount_cents,label,status,provider_checkout_session_id")
        .eq("id", input.milestoneId)
        .eq("invoice_id", invoiceId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Milestone not found.");
      if (data.status === "paid") throw new Error("This milestone has already been paid.");
      if (data.status === "canceled") throw new Error("This milestone is canceled.");
      milestone = data;
      amountCents = data.amount_cents;
      description = `Invoice ${invoice.invoice_number} — ${data.label}`;
    } else {
      const { data: milestones, error } = await admin
        .from("invoice_milestones")
        .select("id")
        .eq("invoice_id", invoiceId)
        .eq("workspace_id", workspaceId)
        .neq("status", "canceled")
        .limit(1);
      if (error) throw error;
      if (milestones && milestones.length > 0) {
        throw new Error("This invoice uses stage billing. Create a payment link for an individual milestone.");
      }
    }

    if (!Number.isInteger(amountCents) || amountCents < 50) {
      throw new Error("Invoice has no payable balance of at least $0.50.");
    }

    const { data: paymentAccount, error: accountError } = await admin
      .from("workspace_payment_accounts")
      .select("provider_account_id")
      .eq("workspace_id", workspaceId)
      .eq("provider", "stripe")
      .maybeSingle();
    if (accountError) throw accountError;
    if (!paymentAccount?.provider_account_id) {
      throw new Error("Connect a Stripe test account before creating payment links.");
    }

    const connectedAccount = await stripe.accounts.retrieve(paymentAccount.provider_account_id);
    if (!connectedAccount.charges_enabled) {
      throw new Error("Stripe test onboarding is not complete yet.");
    }

    const transactionQuery = admin
      .from("payment_transactions")
      .select("provider_checkout_session_id,amount_cents,idempotency_key")
      .eq("workspace_id", workspaceId)
      .eq("invoice_id", invoiceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    const { data: pendingTransactions, error: pendingError } = milestone
      ? await transactionQuery.eq("milestone_id", milestone.id)
      : await transactionQuery.is("milestone_id", null);
    if (pendingError) throw pendingError;

    const existingSessionId = pendingTransactions?.[0]?.provider_checkout_session_id ?? milestone?.provider_checkout_session_id ?? null;
    if (existingSessionId) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(existingSessionId);
        if (existing.status === "open" && existing.payment_status !== "paid" && existing.amount_total === amountCents) {
          return NextResponse.json({ url: existing.url, sessionId: existing.id, reused: true, testMode: true });
        }
        if (existing.status === "open" && existing.amount_total !== amountCents) {
          await stripe.checkout.sessions.expire(existing.id);
        }
      } catch {
        // Expired or missing sessions are replaced below.
      }
    }

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("email")
      .eq("id", invoice.customer_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (customerError) throw customerError;

    const feeCents = applicationFeeCents(amountCents);
    const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
      transfer_data: { destination: connectedAccount.id },
      metadata: {
        workspaceId,
        invoiceId,
        ...(milestone ? { milestoneId: milestone.id } : {})
      }
    };
    if (feeCents > 0) paymentIntentData.application_fee_amount = feeCents;

    const base = input.origin ? new URL(input.origin).origin : new URL(request.url).origin;
    const idempotencyKey = operateCheckoutIdempotencyKey({
      workspaceId,
      invoiceId,
      milestoneId: milestone?.id ?? null,
      amountCents,
      connectedAccountId: connectedAccount.id
    });

    const paramsForStripe: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: [{
        price_data: {
          currency: invoice.currency,
          unit_amount: amountCents,
          product_data: { name: description.slice(0, 120) }
        },
        quantity: 1
      }],
      payment_intent_data: paymentIntentData,
      metadata: {
        workspaceId,
        invoiceId,
        ...(milestone ? { milestoneId: milestone.id } : {})
      },
      success_url: `${base}/operate/invoices/${invoiceId}?payment=success`,
      cancel_url: `${base}/operate/invoices/${invoiceId}?payment=cancelled`
    };
    if (customer?.email) paramsForStripe.customer_email = customer.email;

    const session = await stripe.checkout.sessions.create(paramsForStripe, { idempotencyKey });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    const { error: transactionError } = await admin.from("payment_transactions").upsert(
      {
        workspace_id: workspaceId,
        invoice_id: invoiceId,
        milestone_id: milestone?.id ?? null,
        provider: "stripe",
        provider_checkout_session_id: session.id,
        amount_cents: amountCents,
        currency: invoice.currency,
        status: "pending",
        idempotency_key: idempotencyKey,
        metadata: { testMode: true, applicationFeeCents: feeCents }
      },
      { onConflict: "provider,idempotency_key" }
    );
    if (transactionError) throw transactionError;

    if (milestone) {
      const { error } = await admin
        .from("invoice_milestones")
        .update({ provider_checkout_session_id: session.id })
        .eq("id", milestone.id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    }

    return NextResponse.json({ url: session.url, sessionId: session.id, reused: false, testMode: true });
  } catch (error) {
    return apiError(error, "Unable to create Stripe test payment link.");
  }
}
