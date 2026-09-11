import { NextResponse } from "next/server";
import { z } from "zod";
import { projectIdSchema } from "@/lib/domain/schemas";
import { apiError } from "@/lib/http";
import { getUsableGitHubAccessToken } from "@/lib/provider-connections/github-oauth";
import { getGitHubCheckSummary } from "@/lib/source-control/github";
import { verifyGitHubPullRequest } from "@/lib/source-control/pull-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const approvalSchema = z.object({
  runId: z.string().uuid(),
  revision: z.number().int().nonnegative()
});

type Context = { params: Promise<{ projectId: string }> };

type ProjectRow = {
  id: string;
  owner_id: string;
  workspace_id: string | null;
};

type SourceControlRunRow = {
  id: string;
  project_id: string;
  repository_full_name: string;
  base_branch: string;
  working_branch: string;
  head_sha: string | null;
  pull_request_number: number | null;
  preview_url: string | null;
  preview_deployment_id: string | null;
  production_deployment_id: string | null;
  production_requested_by: string | null;
  production_requested_at: string | null;
  production_url: string | null;
  production_verified_at: string | null;
  stage: string;
  revision: number;
  approved_by: string | null;
  approved_at: string | null;
  merged_sha: string | null;
  merged_at: string | null;
  blocked_reason: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type DeploymentRow = {
  id: string;
  environment: string;
  status: string;
  provider_deployment_id: string | null;
  url: string | null;
  failure_message: string | null;
  vercel_project_id: string | null;
  vercel_project_name: string | null;
  provider_attempted_at: string | null;
  provider_reconcile_attempts: number;
  provider_last_observed_state: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

const RUN_SELECT =
  "id,project_id,repository_full_name,base_branch,working_branch,head_sha,pull_request_number,preview_url,preview_deployment_id,production_deployment_id,production_requested_by,production_requested_at,production_url,production_verified_at,stage,revision,approved_by,approved_at,merged_sha,merged_at,blocked_reason,last_error,created_at,updated_at";

const DEPLOYMENT_SELECT =
  "id,environment,status,provider_deployment_id,url,failure_message,vercel_project_id,vercel_project_name,provider_attempted_at,provider_reconcile_attempts,provider_last_observed_state,created_at,started_at,completed_at";

async function loadAccess(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id,owner_id,workspace_id")
    .eq("id", projectId)
    .single();
  if (error || !project) throw new Error("Project not found.");

  return { user, project: project as ProjectRow };
}

function publicRun(run: SourceControlRunRow) {
  return {
    id: run.id,
    stage: run.stage,
    revision: run.revision,
    repositoryFullName: run.repository_full_name,
    baseBranch: run.base_branch,
    workingBranch: run.working_branch,
    headSha: run.head_sha,
    pullRequestNumber: run.pull_request_number,
    previewUrl: run.preview_url,
    approvedBy: run.approved_by,
    approvedAt: run.approved_at,
    mergedSha: run.merged_sha,
    mergedAt: run.merged_at,
    productionDeploymentId: run.production_deployment_id,
    productionRequestedBy: run.production_requested_by,
    productionRequestedAt: run.production_requested_at,
    productionUrl: run.production_url,
    productionVerifiedAt: run.production_verified_at,
    blockedReason: run.blocked_reason,
    lastError: run.last_error,
    createdAt: run.created_at,
    updatedAt: run.updated_at
  };
}

function publicDeployment(deployment: DeploymentRow | null) {
  if (!deployment) return null;
  return {
    id: deployment.id,
    environment: deployment.environment,
    status: deployment.status,
    providerDeploymentId: deployment.provider_deployment_id,
    url: deployment.url,
    failureMessage: deployment.failure_message?.slice(0, 2000) ?? null,
    vercelProjectId: deployment.vercel_project_id,
    vercelProjectName: deployment.vercel_project_name,
    providerAttemptedAt: deployment.provider_attempted_at,
    providerReconcileAttempts: deployment.provider_reconcile_attempts,
    providerLastObservedState: deployment.provider_last_observed_state,
    createdAt: deployment.created_at,
    startedAt: deployment.started_at,
    completedAt: deployment.completed_at
  };
}

export async function GET(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    await loadAccess(projectId);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("source_control_runs")
      .select(RUN_SELECT)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        run: null,
        deployments: { preview: null, production: null },
        productionReleaseEnabled:
          process.env.VERCEL_PRODUCTION_RELEASES_ENABLED === "true"
      });
    }

    const run = data as SourceControlRunRow;
    const deploymentIds = [
      run.preview_deployment_id,
      run.production_deployment_id
    ].filter((value): value is string => Boolean(value));

    let previewDeployment: DeploymentRow | null = null;
    let productionDeployment: DeploymentRow | null = null;

    if (deploymentIds.length) {
      const { data: deployments, error: deploymentError } = await admin
        .from("deployments")
        .select(DEPLOYMENT_SELECT)
        .eq("project_id", projectId)
        .in("id", deploymentIds);
      if (deploymentError) throw deploymentError;

      for (const deployment of (deployments ?? []) as DeploymentRow[]) {
        if (deployment.id === run.preview_deployment_id) previewDeployment = deployment;
        if (deployment.id === run.production_deployment_id) productionDeployment = deployment;
      }
    }

    return NextResponse.json({
      run: publicRun(run),
      deployments: {
        preview: publicDeployment(previewDeployment),
        production: publicDeployment(productionDeployment)
      },
      productionReleaseEnabled:
        process.env.VERCEL_PRODUCTION_RELEASES_ENABLED === "true"
    });
  } catch (error) {
    return apiError(error, "Unable to load source-control status.");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = approvalSchema.parse(await request.json());
    const { user, project } = await loadAccess(projectId);
    if (!project.workspace_id) {
      throw new Error("Project has no workspace GitHub connection.");
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("source_control_runs")
      .select(RUN_SELECT)
      .eq("id", input.runId)
      .eq("project_id", projectId)
      .single();
    if (error || !data) throw new Error("Source-control run not found.");

    const run = data as SourceControlRunRow;
    if (run.stage !== "preview_ready" || run.revision !== input.revision) {
      throw new Error("Source-control run changed or is not ready for approval.");
    }
    if (!run.pull_request_number || !run.head_sha) {
      throw new Error("Preview-ready run is missing its GitHub identity.");
    }

    const accessToken = await getUsableGitHubAccessToken(project.workspace_id);
    await verifyGitHubPullRequest(accessToken, run.repository_full_name, {
      pullRequestNumber: run.pull_request_number,
      workingBranch: run.working_branch,
      baseBranch: run.base_branch,
      expectedHeadSha: run.head_sha
    });

    const checks = await getGitHubCheckSummary(
      accessToken,
      run.repository_full_name,
      run.head_sha
    );
    if (!checks.passed) {
      throw new Error(
        checks.failed > 0
          ? "GitHub checks are failing. Approval is blocked."
          : "GitHub checks are not fully complete. Approval is blocked."
      );
    }

    const { data: approved, error: approvalError } = await admin.rpc(
      "approve_source_control_run",
      {
        p_run_id: run.id,
        p_expected_revision: run.revision,
        p_user_id: user.id
      }
    );
    if (approvalError) throw approvalError;

    return NextResponse.json({
      run: publicRun(approved as SourceControlRunRow)
    });
  } catch (error) {
    return apiError(error, "Unable to approve source-control run.");
  }
}
