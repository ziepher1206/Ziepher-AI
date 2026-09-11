import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createWorkingBranchName, parseRepositoryFullName } from "@/lib/source-control/lifecycle";
import type { SourceControlRun } from "@/lib/source-control/store";

function validateRun(value: unknown): SourceControlRun {
  const run = value as SourceControlRun;
  if (!run?.id || !run.project_id || !run.repository_full_name || !run.working_branch) {
    throw new Error("Invalid source-control run returned by database.");
  }
  return run;
}

export async function ensureSourceControlRunForBuild(input: {
  projectId: string;
  buildJobId: string;
  repositoryFullName: string;
  baseBranch: string;
}) {
  parseRepositoryFullName(input.repositoryFullName);
  const baseBranch = input.baseBranch.trim();
  if (!baseBranch) throw new Error("Repository default branch is required.");

  const workingBranch = createWorkingBranchName(input.projectId, input.buildJobId);
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("source_control_runs")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("working_branch", workingBranch)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not check source-control run: ${existingError.message}`);
  }

  if (existing) {
    const run = validateRun(existing);
    if (
      run.build_job_id !== input.buildJobId ||
      run.repository_full_name !== input.repositoryFullName ||
      run.base_branch !== baseBranch
    ) {
      throw new Error("Existing source-control run does not match this build snapshot.");
    }
    return run;
  }

  const { data, error } = await admin
    .from("source_control_runs")
    .insert({
      project_id: input.projectId,
      build_job_id: input.buildJobId,
      repository_full_name: input.repositoryFullName,
      base_branch: baseBranch,
      working_branch: workingBranch,
      stage: "queued"
    })
    .select("*")
    .single();

  if (!error) return validateRun(data);

  // A worker retry may race another retry after the same build checkpoint.
  // The project + deterministic working branch unique index is the authority.
  if (error.code === "23505") {
    const { data: raced, error: racedError } = await admin
      .from("source_control_runs")
      .select("*")
      .eq("project_id", input.projectId)
      .eq("working_branch", workingBranch)
      .single();
    if (racedError) {
      throw new Error(`Could not recover source-control run race: ${racedError.message}`);
    }
    const run = validateRun(raced);
    if (
      run.build_job_id !== input.buildJobId ||
      run.repository_full_name !== input.repositoryFullName ||
      run.base_branch !== baseBranch
    ) {
      throw new Error("Raced source-control run does not match this build snapshot.");
    }
    return run;
  }

  throw new Error(`Could not enqueue source-control run: ${error.message}`);
}
