import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import { stripeIsEnabled } from "@/lib/env";

export async function GET() {
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

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select(
        "plan,status,current_period_end,cancel_at_period_end,updated_at"
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;

    const { data: credits, error: creditsError } = await supabase
      .from("credit_accounts")
      .select("balance,reserved,updated_at")
      .eq("workspace_id", workspaceId)
      .single();
    if (creditsError) throw creditsError;

    return NextResponse.json({
      enabled: stripeIsEnabled(),
      subscription: subscription ?? {
        plan: "explore",
        status: "inactive",
        current_period_end: null,
        cancel_at_period_end: false
      },
      credits
    });
  } catch (error) {
    return apiError(error, "Unable to load billing status.");
  }
}
