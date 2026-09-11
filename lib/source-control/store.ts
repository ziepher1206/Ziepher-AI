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
  source_storage_path: string | null;
  source_sha256: string | null;
  worker_id: string | null;
  lease_expires_at: string | null;
  heartbeat_at: string | null;
  attempt_count: number;
};

function parseRun(value: unknown): SourceControlRun {
  const row = value as SourceControlRun;
  sourceControlStageSchema.parse(row.stage);
  if (!Number.isInteger(row.revision) || row.revision < 0) {
    throw new Error("Source-control run has an invalid revision.");
  }
  return row;
}

export async function createSourceControlRun(input: {
  projectId: string;
  buildJobId?: string;
  repositoryFullName: string;
  baseBranch?: string;
  workingBranch: string;
  baseSha?: string;
  sourceStoragePath?: string;
  sourceSha256?: string;
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
      source_storage_path: input.sourceStoragePath ?? null,
      source_sha256: input.sourceSha256 ?? null,
      stage: "queued"
    })
    .select("*")
    .single();

  if (error) throw new Error(`Could not create source-control run: ${error.message}`);
  return parseRun(data);
}

export async function ensureSourceControlRunForBuild(input: {
  projectId: string;
  buildJobId: string;
  repositoryFullName: string;
  baseBranch: string;
  workingBranch: string;
  sourceStoragePath: string;
  sourceSha256: string;
}) {
  const admin = createAdminClient();
  const row = {
    project_id: input.projectId,
    build_job_id: input.buildJobId,
    repository_full_name: input.repositoryFullName,
    base_branch: input.baseBranch,
    working_branch: input.workingBranch,
    source_storage_path: input.sourceStoragePath,
    source_sha256: input.sourceSha256,
    stage: "queued" as const
  };

  const { data: inserted, error: insertError } = await admin
    .from("source_control_runs")
    .upsert(row, { onConflict: "build_job_id", ignoreDuplicates: true })
    .select("*")
    .maybeSingle();

  if (insertError) {
    throw new Error(`Could not ensure source-control run: ${insertError.message}`);
  }

  let run = inserted ? parseRun(inserted) : null;
  if (!run) {
    const { data, error } = await admin
      .from("source_control_runs")
      .select("*")
      .eq("build_job_id", input.buildJobId)
      .single();
    if (error) {
      throw new Error(`Could not load existing source-control run: ${error.message}`);
    }
    run = parseRun(data);
  }

  const identityMatches =
    run.project_id === input.projectId &&
    run.repository_full_name === input.repositoryFullName &&
    run.base_branch === input.baseBranch &&
    run.working_branch === input.workingBranch &&
    run.source_storage_path === input.sourceStoragePath &&
    run.source_sha256 === input.sourceSha256;

  if (!identityMatches) {
    throw new Error(
      "Existing source-control run does not match the validated build checkpoint."
    );
  }

  return run;
}

export async function claimNextSourceControlRun(
  workerId: string,
  leaseSeconds = 600
) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_next_source_control_run", {
    p_worker_id: workerId,
    p_lease_seconds: leaseSeconds
  });
  if (error) throw new Error(`Could not claim source-control run: ${error.message}`);
  if (!data) return null;
  return parseRun(Array.isArray(data) ? data[0] : data);
}

export async function heartbeatSourceControlRun(
  runId: string,
  workerId: string,
  leaseSeconds = 600
) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("heartbeat_source_control_run", {
    p_run_id: runId,
    p_worker_id: workerId,
    p_lease_seconds: leaseSeconds
  });
  if (error) throw new Error(`Could not heartbeat source-control run: ${error.message}`);
}

export async function bindSourceControlBaseSha(
  run: SourceControlRun,
  baseSha: string
) {
  if (run.base_sha) {
    if (run.base_sha !== baseSha) {
      throw new Error("Source-control base SHA is already bound to a different commit.");
    }
    return run;
  }
  if (run.stage !== "queued") {
    throw new Error("Source-control base SHA can only be bound while queued.");
  }
  if (!/^[a-f0-9]{40}$/i.test(baseSha)) {
    throw new Error("A full Git commit SHA is required for the source-control base.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("source_control_runs")
    .update({
      base_sha: baseSha,
      revision: run.revision + 1,
      updated_at: new Date().toISOString()
    })
    .eq("id", run.id)
    .eq("revision", run.revision)
    .eq("stage", "queued")
    .is("base_sha", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not bind source-control base SHA: ${error.message}`);
  }
  return parseRun(data);
}

export async function scheduleSourceControlRetry(
  run: SourceControlRun,
  errorMessage: string,
  delaySeconds = 60
) {
  const admin = createAdminClient();
  const now = Date.now();
  const { data, error } = await admin
    .from("source_control_runs")
    .update({
      revision: run.revision + 1,
      last_error: errorMessage.slice(0, 4000),
      worker_id: null,
      heartbeat_at: new Date(now).toISOString(),
      lease_expires_at: new Date(
        now + Math.max(60, Math.min(delaySeconds, 3600)) * 1000
      ).toISOString(),
      updated_at: new Date(now).toISOString()
    })
    .eq("id", run.id)
    .eq("revision", run.revision)
    .eq("stage", run.stage)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not schedule source-control retry: ${error.message}`);
  }
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
