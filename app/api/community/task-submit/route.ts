import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const REPOSITORY = "ziepher1206/Ziepher-AI";

export async function POST() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server-side contributor sync is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const admin = createAdminClient();
  const { data: contributor, error: contributorError } = await admin
    .from("community_contributors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (contributorError || !contributor) {
    return NextResponse.json({ error: "Contributor identity not found." }, { status: 404 });
  }

  const { data: claim, error: claimError } = await admin
    .from("contribution_events")
    .select("id, metadata")
    .eq("contributor_id", contributor.id)
    .eq("repository", REPOSITORY)
    .eq("contribution_type", "task_claim")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (claimError || !claim) {
    return NextResponse.json({ error: "No active task claim found." }, { status: 404 });
  }

  const currentMetadata = claim.metadata && typeof claim.metadata === "object" && !Array.isArray(claim.metadata)
    ? claim.metadata as Record<string, unknown>
    : {};
  const workflowState = currentMetadata.claim_state;
  if (workflowState === "submitted" || workflowState === "under_review") {
    return NextResponse.json({ state: workflowState });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("contribution_events")
    .update({
      metadata: {
        ...currentMetadata,
        claim_state: "submitted",
        submitted_at: now,
      },
      updated_at: now,
    })
    .eq("id", claim.id)
    .select("id, metadata, status, updated_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Could not mark task submitted." }, { status: 500 });
  }

  return NextResponse.json({ contribution: updated });
}
