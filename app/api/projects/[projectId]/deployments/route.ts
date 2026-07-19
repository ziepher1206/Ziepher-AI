import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import { projectIdSchema } from "@/lib/domain/schemas";

type Context = { params: Promise<{ projectId: string }> };

const deploymentRequestSchema = z.object({
  version: z.number().int().positive(),
  provider: z.enum(["vercel", "manual"]).default("vercel"),
  environment: z.enum(["preview", "production"]).default("preview")
});

export async function GET(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
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
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) throw error;
    return NextResponse.json({ deployments: data });
  } catch (error) {
    return apiError(error, "Unable to load deployments.");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = deploymentRequestSchema.parse(await request.json());
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase.rpc("request_project_deployment", {
      p_project_id: projectId,
      p_version: input.version,
      p_provider: input.provider,
      p_environment: input.environment
    });

    if (error) throw error;
    return NextResponse.json({ deploymentId: data }, { status: 202 });
  } catch (error) {
    return apiError(error, "Unable to queue deployment.");
  }
}
