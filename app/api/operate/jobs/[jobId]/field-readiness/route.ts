import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const schema = z.object({
  accessNotes: z.string().max(4000).nullable().optional(),
  hazardNotes: z.string().max(4000).nullable().optional(),
  treeNotes: z.string().max(8000).nullable().optional(),
  jobNotes: z.string().max(8000).nullable().optional()
});

type Props = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const { jobId } = await params;
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id,workspace_id,property_id")
      .eq("id", jobId)
      .single();
    if (jobError) throw jobError;

    if (input.jobNotes !== undefined) {
      const { error } = await supabase
        .from("jobs")
        .update({ description: input.jobNotes?.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .eq("workspace_id", job.workspace_id);
      if (error) throw error;
    }

    if (job.property_id && (input.accessNotes !== undefined || input.hazardNotes !== undefined || input.treeNotes !== undefined)) {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.accessNotes !== undefined) update.access_notes = input.accessNotes?.trim() || null;
      if (input.hazardNotes !== undefined) update.hazard_notes = input.hazardNotes?.trim() || null;
      if (input.treeNotes !== undefined) {
        const value = input.treeNotes?.trim();
        update.tree_notes = value ? { summary: value } : {};
      }
      const { error } = await supabase
        .from("properties")
        .update(update)
        .eq("id", job.property_id)
        .eq("workspace_id", job.workspace_id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Unable to update field information.");
  }
}
