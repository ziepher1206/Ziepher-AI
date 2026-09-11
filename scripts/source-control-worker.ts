import { setTimeout as sleep } from "node:timers/promises";
import { getUsableGitHubAccessToken } from "@/lib/provider-connections/github-oauth";
import {
  ensureGitHubBranchAtBase,
  getGitHubCheckSummary,
  publishGitHubFilesAtomically
} from "@/lib/source-control/github";
import {
  ensureGitHubPullRequest,
  verifyGitHubPullRequest
} from "@/lib/source-control/pull-request";
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
  pull_request_number: number | null;
  preview_deployment_id: string | null;
  stage:
    | "queued"
    | "branch_created"
    | "changes_ready"
    | "pull_request_open"
    | "checks_running";
  revision: number;
  worker_id: string | null;
};

type PreviewDeployment = {
  status: "queued" | "building" | "deploying" | "ready" | "failed" | "cancelled";
  url: string | null;
  failure_message: string | null;
  provider: string;
  environment: string;
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

async function processChangesReadyRun(
  run: ClaimedSourceControlRun,
  accessToken: string
) {
  if (!run.build_job_id) {
    throw new Error("Source-control run is missing its build job identity.");
  }
  if (!run.head_sha || !/^[a-f0-9]{40}$/i.test(run.head_sha)) {
    throw new Error("Source-control run is missing a valid source commit SHA.");
  }

  const pullRequest = await ensureGitHubPullRequest(
    accessToken,
    run.repository_full_name,
    {
      workingBranch: run.working_branch,
      baseBranch: run.base_branch,
      expectedHeadSha: run.head_sha,
      runId: run.id,
      buildJobId: run.build_job_id
    }
  );

  const { error } = await supabase.rpc(
    "complete_source_control_pull_request_open",
    {
      p_run_id: run.id,
      p_worker_id: workerId,
      p_expected_revision: run.revision,
      p_pull_request_number: pullRequest.number,
      p_head_sha: pullRequest.headSha
    }
  );
  if (error) throw error;

  console.log(
    `[${workerId}] source-control run ${run.id} pull request #${pullRequest.number} ${pullRequest.created ? "created" : "reconciled"}`
  );
}

function requirePullRequestIdentity(run: ClaimedSourceControlRun) {
  if (!run.pull_request_number || run.pull_request_number < 1) {
    throw new Error("Source-control run is missing its pull request number.");
  }
  if (!run.head_sha || !/^[a-f0-9]{40}$/i.test(run.head_sha)) {
    throw new Error("Source-control run is missing a valid pull request head SHA.");
  }
  return {
    pullRequestNumber: run.pull_request_number,
    headSha: run.head_sha.toLowerCase()
  };
}

async function rescheduleChecks(
  run: ClaimedSourceControlRun,
  pullRequestNumber: number,
  headSha: string,
  delaySeconds: number
) {
  const { error } = await supabase.rpc("reschedule_source_control_checks", {
    p_run_id: run.id,
    p_worker_id: workerId,
    p_expected_revision: run.revision,
    p_pull_request_number: pullRequestNumber,
    p_head_sha: headSha,
    p_delay_seconds: delaySeconds,
    p_last_error: null
  });
  if (error) throw error;
}

async function processChecksAndPreviewRun(
  run: ClaimedSourceControlRun,
  accessToken: string
) {
  const identity = requirePullRequestIdentity(run);
  await verifyGitHubPullRequest(accessToken, run.repository_full_name, {
    pullRequestNumber: identity.pullRequestNumber,
    workingBranch: run.working_branch,
    baseBranch: run.base_branch,
    expectedHeadSha: identity.headSha
  });

  const checks = await getGitHubCheckSummary(
    accessToken,
    run.repository_full_name,
    identity.headSha
  );

  if (checks.failed > 0) {
    throw new Error(
      `GitHub checks failed for pull request #${identity.pullRequestNumber}.`
    );
  }

  if (!checks.passed) {
    await rescheduleChecks(run, identity.pullRequestNumber, identity.headSha, 30);
    console.log(
      `[${workerId}] source-control run ${run.id} waiting for GitHub checks (${checks.pending} pending, ${checks.total} total)`
    );
    return;
  }

  if (!run.preview_deployment_id) {
    const { error } = await supabase.rpc(
      "queue_source_control_preview_deployment",
      {
        p_run_id: run.id,
        p_worker_id: workerId,
        p_expected_revision: run.revision,
        p_pull_request_number: identity.pullRequestNumber,
        p_head_sha: identity.headSha,
        p_delay_seconds: 20
      }
    );
    if (error) throw error;
    console.log(
      `[${workerId}] source-control run ${run.id} queued its Vercel preview after green checks`
    );
    return;
  }

  const { data: deployment, error: deploymentError } = await supabase
    .from("deployments")
    .select("status,url,failure_message,provider,environment")
    .eq("id", run.preview_deployment_id)
    .eq("project_id", run.project_id)
    .single();
  if (deploymentError) throw deploymentError;

  const preview = deployment as PreviewDeployment;
  if (preview.provider !== "vercel" || preview.environment !== "preview") {
    throw new Error("Linked preview deployment does not match the Vercel preview rail.");
  }

  if (preview.status === "failed" || preview.status === "cancelled") {
    throw new Error(
      preview.failure_message || `Vercel preview deployment ${preview.status}.`
    );
  }

  if (preview.status !== "ready") {
    await rescheduleChecks(run, identity.pullRequestNumber, identity.headSha, 20);
    console.log(
      `[${workerId}] source-control run ${run.id} waiting for Vercel preview (${preview.status})`
    );
    return;
  }

  if (!preview.url || !/^https:\/\/\S+$/.test(preview.url)) {
    throw new Error("Vercel preview is ready but has no valid HTTPS URL.");
  }

  const { error } = await supabase.rpc(
    "complete_source_control_preview_ready",
    {
      p_run_id: run.id,
      p_worker_id: workerId,
      p_expected_revision: run.revision,
      p_pull_request_number: identity.pullRequestNumber,
      p_head_sha: identity.headSha
    }
  );
  if (error) throw error;

  console.log(
    `[${workerId}] source-control run ${run.id} preview ready at ${preview.url}`
  );
}

async function processRun(run: ClaimedSourceControlRun) {
  try {
    const accessToken = await workspaceAccessToken(run.project_id);
    if (run.stage === "queued") {
      await processQueuedRun(run, accessToken);
      return;
    }
    if (run.stage === "branch_created") {
      await processBranchCreatedRun(run, accessToken);
      return;
    }
    if (run.stage === "changes_ready") {
      await processChangesReadyRun(run, accessToken);
      return;
    }
    await processChecksAndPreviewRun(run, accessToken);
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
