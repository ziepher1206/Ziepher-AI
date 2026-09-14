"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCommunityReviewWorkspace } from "@/lib/community/review-workspace";
import {
  rejectContributionEvent,
  verifyContributionEvent,
} from "@/lib/community/verification";

const verifySchema = z.object({
  eventId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
  quality: z.coerce.number().min(0).max(100),
  originality: z.coerce.number().min(0).max(100),
  reliability: z.coerce.number().min(0).max(100),
  documentationValue: z.coerce.number().min(0).max(100),
  reviewEffort: z.coerce.number().min(0).max(100),
  moduleImportance: z.coerce.number().min(0).max(100),
  ongoingResponsibility: z.coerce.number().min(0).max(100),
  securityImportance: z.coerce.number().min(0).max(100),
});

const rejectSchema = z.object({
  eventId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
});

async function requireAuthorizedReviewer() {
  const workspace = await getCommunityReviewWorkspace();
  if (workspace.access.state !== "authorized") {
    throw new Error("Verified maintainer identity required.");
  }
  return workspace.access;
}

export async function verifyContributionAction(formData: FormData) {
  const reviewer = await requireAuthorizedReviewer();
  const input = verifySchema.parse(Object.fromEntries(formData));

  await verifyContributionEvent({
    eventId: input.eventId,
    verifierContributorId: reviewer.contributorId,
    reason: input.reason,
    factors: {
      quality: input.quality,
      originality: input.originality,
      reliability: input.reliability,
      documentationValue: input.documentationValue,
      reviewEffort: input.reviewEffort,
      moduleImportance: input.moduleImportance,
      ongoingResponsibility: input.ongoingResponsibility,
      securityImportance: input.securityImportance,
    },
  });

  revalidatePath("/community/review");
}

export async function rejectContributionAction(formData: FormData) {
  const reviewer = await requireAuthorizedReviewer();
  const input = rejectSchema.parse(Object.fromEntries(formData));

  await rejectContributionEvent({
    eventId: input.eventId,
    verifierContributorId: reviewer.contributorId,
    reason: input.reason,
  });

  revalidatePath("/community/review");
}
