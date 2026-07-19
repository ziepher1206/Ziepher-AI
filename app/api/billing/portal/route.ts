import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { apiError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: workspaceId, error: workspaceError } = await supabase.rpc(
      "ensure_personal_workspace"
    );
    if (workspaceError) throw workspaceError;

    const admin = createAdminClient();
    const { data: subscription, error } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .single();
    if (error || !subscription?.stripe_customer_id) {
      throw new Error("No Stripe customer exists for this workspace.");
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/settings/billing`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiError(error, "Unable to open the billing portal.");
  }
}
