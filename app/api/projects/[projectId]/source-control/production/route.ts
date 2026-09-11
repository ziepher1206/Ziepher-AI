import { NextResponse } from "next/server";
import { z } from "zod";
import { projectIdSchema } from "@/lib/domain/schemas";
import { apiError } from "@/lib/http";
import { getUsableGitHubAccessToken } from "@/lib/provider-connections/github-oauth";
import { getGitHubRefSha } from "@/lib/source-control/github";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  runId: z.string().uuid(),
  revision: z.number().int().nonnegative()
});

type Context = { params: Promise<{ projectId: string }> };

type ProjectRow = {
  id: string;
  workspace_id: string | null;
};

type RunRow = {
  id: string;
  project_id: string;
  repository_full_name: string;
  base_branch: string;
  merged_sha: string | null;
  stage: string;
  revision: number;
};

export async function POST(request: Request, context: Context) {
  try {
    if (process.env.VERCEL_PRODUCTION_RELEASES_ENABLED !== "true") {
      throw new Error(
        "Production releases are disabled. Enable the production Vercel rail only after its credentials and worker are verified."
      );
    }

    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = requestSchema.parse(await request.json());
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,workspace_id")
      .eq("id", projectId)
      .single();
    if (projectError || !project) throw new Error("Project not found.");

    const projectRow = project as ProjectRow;
    if (!projectRow.workspace_id) {
      throw new Error("Project has no workspace GitHub connection.");
    }

    const admin = createAdminClient();
    const { data: runData, error: runError } = await admin
      .from("source_control_runs")
      .select("id,project_id,repository_full_name,base_branch,merged_sha,stage,revision")
      .eq("id", input.runId)
      .eq("project_id", projectId)
      .single();
    if (runError || !runData) throw new Error("Source-control run not found.");

    const run = runData as RunRow;
    if (run.stage !== "merged" || run.revision !== input.revision) {
      throw new Error("Source-control run changed or is not ready for production release.");
    }
    if (!run.merged_sha || !/^[a-f0-9]{40}$/i.test(run.merged_sha)) {
      throw new Error("Merged run is missing its exact merge SHA.");
    }

    const accessToken = await getUsableGitHubAccessToken(projectRow.workspace_id);
    const currentBaseSha = await getGitHubRefSha(
      accessToken,
      run.repository_full_name,
      run.base_branch
    );
    if (currentBaseSha !== run.merged_sha.toLowerCase()) {
      throw new Error(
        "Repository base branch moved after this merge. Refusing to deploy a stale build to production."
      );
    }

    const { data: deploymentId, error: releaseError } = await admin.rpc(
      "request_source_control_production_release",
      {
        p_run_id: run.id,
        p_expected_revision: run.revision,
        p_user_id: user.id
      }
    );
    if (releaseError) throw releaseError;
    if (typeof deploymentId !== "string") {
      throw new Error("Production release did not return a deployment id.");
    }

    return NextResponse.json({ deploymentId });
  } catch (error) {
    return apiError(error, "Unable to request production release.");
  }
}
