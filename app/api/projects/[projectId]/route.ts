import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import {
  projectIdSchema,
  updateProjectSchema
} from "@/lib/domain/schemas";

type Context = { params: Promise<{ projectId: string }> };

async function getProjectId(context: Context) {
  return projectIdSchema.parse((await context.params).projectId);
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  return supabase;
}

export async function GET(_request: Request, context: Context) {
  try {
    const projectId = await getProjectId(context);
    const supabase = await authenticatedClient();

    const { data: project, error } = await supabase
      .from("projects")
      .select(
        "id,name,original_idea,status,preview_url,preview_artifact_path,current_version,active_spec_version_id,selected_visual_concept_id,created_at,updated_at"
      )
      .eq("id", projectId)
      .single();

    if (error || !project) throw new Error("Project not found.");

    const [specResult, conceptsResult, buildsResult, conversationResult] =
      await Promise.all([
        supabase
          .from("app_spec_versions")
          .select("id,version,spec,approved_at,created_at")
          .eq("project_id", projectId)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("visual_concepts")
          .select("id,name,description,tokens,selected,created_at")
          .eq("project_id", projectId)
          .order("created_at"),
        supabase
          .from("build_jobs")
          .select(
            "id,status,quality_mode,reserved_credits,finalized_credits,model_provider,model_name,failure_message,created_at,started_at,completed_at"
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("conversations")
          .select("id")
          .eq("project_id", projectId)
          .order("created_at")
          .limit(1)
          .maybeSingle()
      ]);

    if (specResult.error) throw specResult.error;
    if (conceptsResult.error) throw conceptsResult.error;
    if (buildsResult.error) throw buildsResult.error;
    if (conversationResult.error) throw conversationResult.error;

    let messages: unknown[] = [];
    if (conversationResult.data?.id) {
      const messageResult = await supabase
        .from("messages")
        .select(
          "id,sender,content,input_mode,model_provider,model_name,charged_build_credits,created_at"
        )
        .eq("conversation_id", conversationResult.data.id)
        .order("created_at")
        .limit(100);
      if (messageResult.error) throw messageResult.error;
      messages = messageResult.data ?? [];
    }

    return NextResponse.json({
      project,
      latestSpec: specResult.data,
      concepts: conceptsResult.data ?? [],
      builds: buildsResult.data ?? [],
      messages
    });
  } catch (error) {
    return apiError(error, "Unable to load project.");
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const projectId = await getProjectId(context);
    const input = updateProjectSchema.parse(await request.json());
    const supabase = await authenticatedClient();

    const { data, error } = await supabase
      .from("projects")
      .update(input)
      .eq("id", projectId)
      .select("id,name,status,updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ project: data });
  } catch (error) {
    return apiError(error, "Unable to update project.");
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const projectId = await getProjectId(context);
    const supabase = await authenticatedClient();
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, "Unable to delete project.");
  }
}
