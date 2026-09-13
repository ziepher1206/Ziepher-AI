import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { projectIdSchema } from "@/lib/domain/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  title: z.string().trim().min(3).max(160),
  instructions: z.string().trim().min(10).max(12000),
  sourceType: z.enum(["manual", "scan_recommendation", "campaign"]).default("manual"),
  sourceReference: z.string().trim().max(500).nullable().optional()
});

type Context = { params: Promise<{ projectId: string }> };

async function access(context: Context) {
  const projectId = projectIdSchema.parse((await context.params).projectId);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id,workspace_id")
    .eq("id", projectId)
    .single();
  if (error || !project?.workspace_id) throw new Error("Project not found.");

  return { projectId, workspaceId: project.workspace_id, user, supabase };
}

export async function GET(_request: Request, context: Context) {
  try {
    const { projectId, supabase } = await access(context);
    const { data, error } = await supabase
      .from("site_change_requests")
      .select("id,source_type,source_reference,title,instructions,status,ai_generation_approved,ai_generation_approved_at,spec_version_id,build_job_id,source_control_run_id,preview_url,published_at,change_metadata,created_at,updated_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ changeRequests: data ?? [] });
  } catch (error) {
    return apiError(error, "Unable to load change requests.");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const input = createSchema.parse(await request.json());
    const { projectId, workspaceId, user } = await access(context);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("site_change_requests")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        created_by: user.id,
        source_type: input.sourceType,
        source_reference: input.sourceReference ?? null,
        title: input.title,
        instructions: input.instructions,
        status: "awaiting_ai_approval"
      })
      .select("id,title,status,source_type,created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ changeRequest: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to create change request.");
  }
}
