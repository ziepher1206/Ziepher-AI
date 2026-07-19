import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import { projectIdSchema } from "@/lib/domain/schemas";

type Context = {
  params: Promise<{ projectId: string; version: string }>;
};

export async function POST(_request: Request, context: Context) {
  try {
    const params = await context.params;
    const projectId = projectIdSchema.parse(params.projectId);
    const version = z.coerce.number().int().positive().parse(params.version);
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: restoredVersion, error } = await supabase.rpc(
      "restore_project_version",
      {
        p_project_id: projectId,
        p_target_version: version
      }
    );
    if (error) throw error;

    return NextResponse.json({ restoredVersion });
  } catch (error) {
    return apiError(error, "Unable to restore project version.");
  }
}
