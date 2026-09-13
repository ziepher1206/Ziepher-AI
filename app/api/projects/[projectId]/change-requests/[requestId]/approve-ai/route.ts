import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { projectIdSchema } from "@/lib/domain/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestIdSchema = z.string().uuid();
type Context = { params: Promise<{ projectId: string; requestId: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const params = await context.params;
    const projectId = projectIdSchema.parse(params.projectId);
    const requestId = requestIdSchema.parse(params.requestId);
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();
    if (projectError || !project) throw new Error("Project not found.");

    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("site_change_requests")
      .select("id,status,ai_generation_approved")
      .eq("id", requestId)
      .eq("project_id", projectId)
      .single();
    if (existingError || !existing) throw new Error("Change request not found.");
    if (existing.ai_generation_approved) {
      return NextResponse.json({ changeRequest: existing });
    }
    if (!["draft", "awaiting_ai_approval"].includes(existing.status)) {
      throw new Error("This change request is no longer waiting for AI approval.");
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("site_change_requests")
      .update({
        ai_generation_approved: true,
        ai_generation_approved_by: user.id,
        ai_generation_approved_at: now,
        status: "ready_for_ai"
      })
      .eq("id", requestId)
      .eq("project_id", projectId)
      .select("id,status,ai_generation_approved,ai_generation_approved_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ changeRequest: data });
  } catch (error) {
    return apiError(error, "Unable to approve AI generation.");
  }
}
