import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import { projectIdSchema } from "@/lib/domain/schemas";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase
      .from("project_versions")
      .select("id,version,summary,source_snapshot_path,commit_sha,created_at")
      .eq("project_id", projectId)
      .order("version", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ versions: data });
  } catch (error) {
    return apiError(error, "Unable to load project versions.");
  }
}
