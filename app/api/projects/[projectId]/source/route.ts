import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const { data: version, error } = await supabase
      .from("project_versions")
      .select("source_snapshot_path,version")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error || !version) throw new Error("No source build is available.");

    const admin = createAdminClient();
    const { data, error: signedError } = await admin.storage
      .from("project-artifacts")
      .createSignedUrl(version.source_snapshot_path, 60, {
        download: `ziepher-project-v${version.version}.tar.gz`
      });

    if (signedError) throw signedError;
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    return apiError(error, "Unable to download source.");
  }
}
