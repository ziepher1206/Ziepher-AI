import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import { projectIdSchema } from "@/lib/domain/schemas";

type Context = {
  params: Promise<{ projectId: string; deploymentId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const params = await context.params;
    const projectId = projectIdSchema.parse(params.projectId);
    const deploymentId = z.string().uuid().parse(params.deploymentId);
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase
      .from("deployments")
      .select(
        "id,project_version_id,provider,environment,status,url,failure_message,created_at,started_at,completed_at"
      )
      .eq("id", deploymentId)
      .eq("project_id", projectId)
      .single();

    if (error) throw error;
    return NextResponse.json({ deployment: data });
  } catch (error) {
    return apiError(error, "Unable to load deployment.");
  }
}
