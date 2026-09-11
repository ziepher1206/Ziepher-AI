import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertSourceControlTransition,
  sourceControlStageSchema,
  type SourceControlStage
} from "@/lib/source-control/lifecycle";

export type SourceControlRun = {
  id: string;
  project_id: string;
  build_job_id: string | null;
  repository_full_name: string;
  base_branch: string;
  working_branch: string;
  base_sha: string | null;
  head_sha: string | null;
  pull_request_number: number | null;
  preview_url: string | null;
  stage: SourceControlStage;
  revision: number;
  blocked_reason: string | null;
  last_error: string | null;
};

function parseRun(value: unknown): SourceControlRun {
  const row = value as SourceControlRun;
  sourceControlStageSchema.parse(row.stage);
  return row;
}

export async function createSourceControlRun(input: {
  projectId: string;
  buildJobId?: string;
  repositoryFullName: string;
  baseBranch?: string;
  workingBranch: string;
  baseSha?: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("source_control_runs")
    .insert({
      project_id: input.projectId,
      build_job_id: input.buildJobId ?? null,
      repository_full_name: input.repositoryFullName,
      base_branch: input.baseBranch ?? "main",
      working_branch: input.workingBranch,
      base_sha: input.baseSha ?? null,
      stage: "queued"
    })
    .select("*")
    .single();

  if (error) throw new Error(`Could not create source-control run: ${error.message}`);
  return parseRun(data);
}

export async function transitionSourceControlRun(
  run: SourceControlRun,
  to: SourceControlStage,
  updates: {
    headSha?: string;
    pullRequestNumber?: number;
    previewUrl?: string;
    blockedReason?: string;
    lastError?: string;
  } = {}
) {
  assertSourceControlTransition(run.stage, to);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("transition_source_control_run", {
    p_run_id: run.id,
    p_expected_revision: run.revision,
    p_from_stage: run.stage,
    p_to_stage: to,
    p_head_sha: updates.headSha ?? null,
    p_pull_request_number: updates.pullRequestNumber ?? null,
    p_preview_url: updates.previewUrl ?? null,
    p_blocked_reason: updates.blockedReason ?? null,
    p_last_error: updates.lastError ?? null
  });

  if (error) throw new Error(`Could not transition source-control run: ${error.message}`);
  return parseRun(data);
}
