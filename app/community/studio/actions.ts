"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  reviewEventId: z.string().uuid(),
  reason: z.string().trim().min(10).max(2000),
});

export async function requestContributionRereviewAction(formData: FormData) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Server-side contributor review is not configured.");
  }

  const input = requestSchema.parse(Object.fromEntries(formData));
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) throw new Error("Sign in required.");

  const admin = createAdminClient();
  const { data: contributor, error: contributorError } = await admin
    .from("community_contributors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (contributorError) throw contributorError;
  if (!contributor) throw new Error("Contributor identity not found.");

  const { data: reviewEvent, error: reviewError } = await admin
    .from("contribution_review_events")
    .select("id, contribution_event_id, action")
    .eq("id", input.reviewEventId)
    .maybeSingle();
  if (reviewError) throw reviewError;
  if (!reviewEvent || (reviewEvent.action !== "verified" && reviewEvent.action !== "rejected")) {
    throw new Error("Only completed verification or rejection decisions can be re-reviewed.");
  }

  const { data: contribution, error: contributionError } = await admin
    .from("contribution_events")
    .select("id, contributor_id, status")
    .eq("id", reviewEvent.contribution_event_id)
    .maybeSingle();
  if (contributionError) throw contributionError;
  if (!contribution || contribution.contributor_id !== contributor.id) {
    throw new Error("You can only request re-review of your own contribution decisions.");
  }
  if (contribution.status !== "verified" && contribution.status !== "rejected") {
    throw new Error("This contribution no longer has a final decision eligible for re-review.");
  }

  const { data: existing, error: existingError } = await admin
    .from("contribution_rereview_requests")
    .select("id")
    .eq("contribution_review_event_id", reviewEvent.id)
    .eq("contributor_id", contributor.id)
    .eq("status", "open")
    .maybeSingle();
  if (existingError) throw existingError;

  if (!existing) {
    const { error: insertError } = await admin
      .from("contribution_rereview_requests")
      .insert({
        contribution_review_event_id: reviewEvent.id,
        contribution_event_id: reviewEvent.contribution_event_id,
        contributor_id: contributor.id,
        reason: input.reason,
        status: "open",
      });
    if (insertError) throw insertError;
  }

  revalidatePath("/community/studio");
  revalidatePath("/community/review");
}
