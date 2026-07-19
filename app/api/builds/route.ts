import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import { buildRequestSchema, projectIdSchema } from "@/lib/domain/schemas";

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  return supabase;
}

export async function GET(request: Request) {
  try {
    const projectId = projectIdSchema.parse(
      new URL(request.url).searchParams.get("projectId")
    );
    const supabase = await authenticatedClient();

    const { data, error } = await supabase
      .from("build_jobs")
      .select(
        "id,status,quality_mode,reserved_credits,finalized_credits,model_provider,model_name,failure_message,created_at,started_at,completed_at"
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ builds: data });
  } catch (error) {
    return apiError(error, "Unable to load builds.");
  }
}

export async function POST(request: Request) {
  try {
    const input = buildRequestSchema.parse(await request.json());
    const supabase = await authenticatedClient();

    const { data, error } = await supabase.rpc("queue_build_job", {
      p_project_id: input.projectId,
      p_spec_version_id: input.approvedSpecVersionId,
      p_quality_mode: input.requestedMode
    });

    if (error) throw error;
    return NextResponse.json({ buildJobId: data }, { status: 202 });
  } catch (error) {
    return apiError(error, "Unable to queue build.");
  }
}
