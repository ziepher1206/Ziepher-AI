import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

type Props = { params: Promise<{ jobId: string }> };

const updateSchema = z.object({
  action: z.enum(["generate", "update", "dismiss", "ready"]),
  subject: z.string().trim().max(200).nullable().optional(),
  message: z.string().trim().min(1).max(5000).optional()
});

export async function POST(request: Request, { params }: Props) {
  try {
    const { jobId } = await params;
    const input = updateSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id,workspace_id,customer_id,title,status,customers(display_name),workspaces(name)")
      .eq("id", jobId)
      .single();
    if (jobError) throw jobError;
    if (!job) throw new Error("Job not found.");
    if (job.status !== "completed") throw new Error("Complete the job before preparing a review request.");

    if (input.action === "generate") {
      const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
      const workspace = Array.isArray(job.workspaces) ? job.workspaces[0] : job.workspaces;
      const { data: profile, error: profileError } = await supabase
        .from("workspace_business_profiles")
        .select("business_name,review_url")
        .eq("workspace_id", job.workspace_id)
        .maybeSingle();
      if (profileError) throw profileError;

      const businessName = profile?.business_name || workspace?.name || "our tree service";
      const firstName = customer?.display_name?.trim().split(/\s+/)[0] || "there";
      const reviewUrl = profile?.review_url ?? null;
      const subject = `How did ${businessName} do?`;
      const message = [
        `Hi ${firstName},`,
        "",
        `Thank you for trusting ${businessName} with ${job.title}. If you were happy with the work, we’d appreciate an honest review.`,
        reviewUrl ? `You can leave a review here: ${reviewUrl}` : "",
        "",
        "Thank you for your business."
      ].filter(Boolean).join("\n");

      const { data, error } = await supabase
        .from("operate_review_requests")
        .upsert({
          workspace_id: job.workspace_id,
          job_id: job.id,
          customer_id: job.customer_id,
          channel: "manual",
          status: "draft",
          subject,
          message,
          review_url: reviewUrl,
          created_by: user.id,
          sent_at: null
        }, { onConflict: "workspace_id,job_id" })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ reviewRequest: data });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.action === "dismiss") update.status = "dismissed";
    if (input.action === "ready") update.status = "ready";
    if (input.action === "update") {
      if (input.subject !== undefined) update.subject = input.subject?.trim() || null;
      if (input.message !== undefined) update.message = input.message.trim();
    }

    const { data, error } = await supabase
      .from("operate_review_requests")
      .update(update)
      .eq("workspace_id", job.workspace_id)
      .eq("job_id", job.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ reviewRequest: data });
  } catch (error) {
    return apiError(error, "Unable to update the review request draft.");
  }
}
