import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { apiError } from "@/lib/http";
import {
  priceIdFor,
  type BillingInterval,
  type PaidPlan
} from "@/lib/billing/plans";

const schema = z.object({
  plan: z.enum(["builder", "pro"]),
  interval: z.enum(["monthly", "annual"]).default("monthly")
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error("Authentication required.");

    const { data: workspaceId, error: workspaceError } = await supabase.rpc(
      "ensure_personal_workspace"
    );
    if (workspaceError) throw workspaceError;

    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (existingError) throw existingError;

    const stripe = getStripe();
    let customerId = existing?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:
          typeof user.user_metadata.full_name === "string"
            ? user.user_metadata.full_name
            : undefined,
        metadata: {
          workspaceId,
          userId: user.id
        }
      });
      customerId = customer.id;

      const { error } = await admin.from("subscriptions").upsert({
        workspace_id: workspaceId,
        stripe_customer_id: customerId,
        plan: "explore",
        status: "inactive"
      });
      if (error) throw error;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceIdFor(
            input.plan as PaidPlan,
            input.interval as BillingInterval
          ),
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=cancelled`,
      metadata: {
        workspaceId,
        plan: input.plan,
        interval: input.interval
      },
      subscription_data: {
        metadata: {
          workspaceId,
          plan: input.plan,
          interval: input.interval
        }
      }
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiError(error, "Unable to create checkout.");
  }
}
