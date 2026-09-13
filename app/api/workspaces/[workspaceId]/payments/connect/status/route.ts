import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireWorkspaceMember } from "@/lib/operate/workspace-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperateStripeTestClient, operateStripeTestEnabled } from "@/lib/stripe/operate";

export const runtime = "nodejs";
type Context = { params: Promise<{ workspaceId: string }> };
const workspaceIdSchema = z.string().uuid();

export async function GET(_request: Request, context: Context) {
  try {
    const workspaceId = workspaceIdSchema.parse((await context.params).workspaceId);
    await requireWorkspaceMember(workspaceId);
    const admin = createAdminClient();

    const { data: record, error } = await admin
      .from("workspace_payment_accounts")
      .select("provider_account_id,charges_enabled,payouts_enabled,onboarding_complete,last_provider_sync_at")
      .eq("workspace_id", workspaceId)
      .eq("provider", "stripe")
      .maybeSingle();
    if (error) throw error;

    if (!record?.provider_account_id || !operateStripeTestEnabled()) {
      return NextResponse.json({
        connected: false,
        testMode: true,
        configured: Boolean(record?.provider_account_id),
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false
      });
    }

    const stripe = getOperateStripeTestClient();
    const account = await stripe.accounts.retrieve(record.provider_account_id);

    const snapshot = {
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      onboarding_complete: account.details_submitted,
      livemode: false,
      last_provider_sync_at: new Date().toISOString()
    };
    const { error: updateError } = await admin
      .from("workspace_payment_accounts")
      .update(snapshot)
      .eq("workspace_id", workspaceId)
      .eq("provider", "stripe");
    if (updateError) throw updateError;

    return NextResponse.json({
      connected: account.charges_enabled && account.payouts_enabled,
      testMode: true,
      configured: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingComplete: account.details_submitted
    });
  } catch (error) {
    return apiError(error, "Unable to check Stripe test status.");
  }
}
