import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireWorkspaceAdmin } from "@/lib/operate/workspace-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperateStripeTestClient } from "@/lib/stripe/operate";

export const runtime = "nodejs";

type Context = { params: Promise<{ workspaceId: string }> };
const workspaceIdSchema = z.string().uuid();
const bodySchema = z.object({ origin: z.string().url().optional() }).default({});

export async function POST(request: Request, context: Context) {
  try {
    const workspaceId = workspaceIdSchema.parse((await context.params).workspaceId);
    const input = bodySchema.parse(await request.json().catch(() => ({})));
    const { user } = await requireWorkspaceAdmin(workspaceId);
    const admin = createAdminClient();
    const stripe = getOperateStripeTestClient();

    const { data: existing, error: existingError } = await admin
      .from("workspace_payment_accounts")
      .select("provider_account_id")
      .eq("workspace_id", workspaceId)
      .eq("provider", "stripe")
      .maybeSingle();
    if (existingError) throw existingError;

    let accountId = existing?.provider_account_id ?? null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        metadata: { workspaceId }
      });
      accountId = account.id;

      const { error } = await admin.from("workspace_payment_accounts").upsert(
        {
          workspace_id: workspaceId,
          provider: "stripe",
          provider_account_id: accountId,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          onboarding_complete: account.details_submitted,
          livemode: false,
          last_provider_sync_at: new Date().toISOString()
        },
        { onConflict: "workspace_id,provider" }
      );
      if (error) throw error;
    }

    const base = input.origin ? new URL(input.origin).origin : new URL(request.url).origin;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/settings/payments?connect=refresh`,
      return_url: `${base}/settings/payments?connect=return`,
      type: "account_onboarding"
    });

    return NextResponse.json({ url: link.url, testMode: true });
  } catch (error) {
    return apiError(error, "Unable to start Stripe test onboarding.");
  }
}
