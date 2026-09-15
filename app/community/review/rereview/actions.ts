"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCommunityReviewWorkspace } from "@/lib/community/review-workspace";
import { createAdminClient } from "@/lib/supabase/admin";

const resolutionSchema = z.object({
  requestId: z.string().uuid(),
  resolution: z.string().trim().min(10).max(2000),
});

async function requireAuthorizedReviewer() {
  const workspace = await getCommunityReviewWorkspace();
  if (workspace.access.state !== "authorized") {
    throw new Error("Verified maintainer identity required.");
  }
  return workspace.access;
}

async function resolveRequest(formData: FormData, status: "resolved" | "dismissed") {
  const reviewer = await requireAuthorizedReviewer();
  const input = resolutionSchema.parse(Object.fromEntries(formData));
  const admin = createAdminClient();

  const { data: request, error: requestError } = await admin
    .from("contribution_rereview_requests")
    .select("id, contributor_id, status")
    .eq("id", input.requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request || request.status !== "open") {
    throw new Error("Only open re-review requests can be resolved.");
  }
  if (request.contributor_id === reviewer.contributorId) {
    throw new Error("Reviewers cannot resolve their own re-review requests.");
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("contribution_rereview_requests")
    .update({
      status,
      resolution: input.resolution,
      resolved_by: reviewer.contributorId,
      resolved_at: now,
      updated_at: now,
    })
    .eq("id", request.id)
    .eq("status", "open");
  if (updateError) throw updateError;

  revalidatePath("/community/review/rereview");
  revalidatePath("/community/review");
  revalidatePath("/community/studio");
}

export async function resolveRereviewRequestAction(formData: FormData) {
  await resolveRequest(formData, "resolved");
}

export async function dismissRereviewRequestAction(formData: FormData) {
  await resolveRequest(formData, "dismissed");
}
