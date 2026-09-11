import { setTimeout as sleep } from "node:timers/promises";
import { getUsableGitHubAccessToken } from "@/lib/provider-connections/github-oauth";
import {
  ensureGitHubBranchAtBase,
  publishGitHubFilesAtomically
} from "@/lib/source-control/github";
import { readVerifiedSourceArchive } from "@/lib/source-control/source-archive";
import { createAdminClient } from "@/lib/supabase/admin";

type ClaimedSourceControlRun = {
  id: string;
  project_id: string;
  build_job_id: string | null;
  repository_full_name: string;
  base_branch: string;
  working_branch: string;
  base_sha: string | null;
  head_sha: string | null;
  stage: "queued" | "branch_created";
  revision: number;
  worker_id: string | null;
};

const workerId =
  process.env.SOURCE_CONTROL_WORKER_ID ?? `source-control-${process.pid}`;
const pollMs = Math.max(
  1000,
  Number(process.env.SOURCE_CONTROL_WORKER_POLL_MS ?? "5000")
);
const supabase = createAdminClient();

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

async function claimRun() {
  const { data, error } = await supabase.rpc("claim_next_source_control_run", {
    p_worker_id: workerId,
    p_lease_seconds: 300
  });
  if (error) throw error;
  return firstRow(data as ClaimedSourceControlRun | ClaimedSourceControlRun[] | null);
}

async function blockRun(run: ClaimedSourceControlRun, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const { error: blockError } = await supabase.rpc(
    "block_source_control_run_worker",
    {
      p_run_id: run.id,
      p_worker_id: workerId,
      p_expected_revision: run.revision,
      p_reason: message.slice(0, 2000)
    }
  );

  if (blockError) {
    console.error(
      `[${workerId}] could not block source-control run ${run.id}:`,
      blockError
    );
  }
}

async function workspaceAccessToken(projectId: string) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", projectId)
    .single();

  if (error) throw error;
  if (!project.workspace_id) {
    throw new Error("Project has no workspace for its GitHub connection.");
  }
  return getUsableGitHubAccessToken(project.workspace_id);
}

async function processQueuedRun(
  run: ClaimedSourceControlRun,
  accessToken: string
) {
  const branch = await ensureGitHubBranchAtBase(
    accessToken,
    run.repository_full_name,
    run.base_branch,
    run.working_branch
  );

  const { error } = await supabase.rpc(
    "complete_source_control_branch_creation",
    {
      p_run_id: run.id,
      p_worker_id: workerId,
      p_expected_revision: run.revision,
      p_base_sha: branch.baseSha
    }
  );
  if (error) throw error;

  console.log(
    `[${workerId}] source-control run ${run.id} branch ${branch.created ? "created" : "reconciled"} at ${branch.baseSha}`
  );
}

async function loadPublishedSource(run: ClaimedSourceControlRun) {
  if (!run.build_job_id) {
    throw new Error("Source-control run is missing its build job identity.");
  }

  const { data: artifact, error: artifactError } = await supabase
    .from("artifacts")
    .select("storage_path, sha256")
    .eq("project_id", run.project_id)
    .eq("build_job_id", run.build_job_id)
    .eq("artifact_type", "source_archive")
    .single();
  if (artifactError) throw artifactError;

  const { data: archive, error: downloadError } = await supabase.storage
    .from("project-artifacts")
    .download(artifact.storage_path);
  if (downloadError) throw downloadError;

  const archiveBytes = Buffer.from(await archive.arrayBuffer());
  const files = await readVerifiedSourceArchive(archiveBytes, artifact.sha256);
  return {
    files,
    sourceSha256: artifact.sha256.toLowerCase()
  };
}

async function processBranchCreatedRun(
  run: ClaimedSourceControlRun,
  accessToken: string
) {
  if (!run.build_job_id) {
    throw new Error("Source-control run is missing its build job identity.");
  }
  if (!run.head_sha || !/^[a-f0-9]{40}$/i.test(run.head_sha)) {
    throw new Error("Source-control run is missing a valid recorded branch head.");
  }

  const source = await loadPublishedSource(run);
  const published = await publishGitHubFilesAtomically(
    accessToken,
    run.repository_full_name,
    {
      branch: run.working_branch,
      expectedParentSha: run.head_sha,
      runId: run.id,
      buildJobId: run.build_job_id,
      sourceSha256: source.sourceSha256,
      files: source.files
    }
  );

  const { error } = await supabase.rpc(
    "complete_source_control_changes_ready",
    {
      p_run_id: run.id,
      p_worker_id: workerId,
      p_expected_revision: run.revision,
      p_head_sha: published.commitSha
    }
  );
  if (error) throw error;

  console.log(
    `[${workerId}] source-control run ${run.id} source ${published.reconciled ? "reconciled" : "committed"} at ${published.commitSha}`
  );
}

async function processRun(run: ClaimedSourceControlRun) {
  try {
    const accessToken = await workspaceAccessToken(run.project_id);
    if (run.stage === "queued") {
      await processQueuedRun(run, accessToken);
      return;
    }
    await processBranchCreatedRun(run, accessToken);
  } catch (error) {
    await blockRun(run, error);
    console.error(`[${workerId}] source-control run ${run.id} blocked:`, error);
  }
}

async function main() {
  console.log(`[${workerId}] Ziepher source-control worker started.`);

  for (;;) {
    try {
      const run = await claimRun();
      if (!run) {
        await sleep(pollMs);
        continue;
      }
      await processRun(run);
    } catch (error) {
      console.error(`[${workerId}] source-control worker loop error:`, error);
      await sleep(pollMs);
    }
  }
}

void main();
