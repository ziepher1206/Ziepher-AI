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

    const { data: project, error } = await supabase
      .from("projects")
      .select("preview_artifact_path")
      .eq("id", projectId)
      .single();

    if (error || !project?.preview_artifact_path) {
      return new Response(
        "<!doctype html><html><body style='font-family:system-ui;padding:40px'><h1>No built preview yet</h1><p>Create and complete a build to publish the interactive preview.</p></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const admin = createAdminClient();
    const { data, error: downloadError } = await admin.storage
      .from("project-artifacts")
      .download(project.preview_artifact_path);

    if (downloadError) throw downloadError;

    return new Response(await data.text(), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"
      }
    });
  } catch (error) {
    return apiError(error, "Unable to load preview.");
  }
}
