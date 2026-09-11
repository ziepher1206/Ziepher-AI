import { setTimeout as sleep } from "node:timers/promises";
import { getUsableGitHubAccessToken } from "@/lib/provider-connections/github-oauth";
import { ensureGitHubBranchAtBase } from "@/lib/source-control/github";
import { createAdminClient } from "@/lib/supabase/admin";

type ClaimedSourceControlRun = {
  id: string;
  project_id: string;
  build_job_id: string | null;
  repository_full_name: string;
  base_branch: string;
  working_branch: string;
  stage: "queued";
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

async function processRun(run: ClaimedSourceControlRun) {
  try {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", run.project_id)
      .single();

    if (projectError) throw projectError;
    if (!project.workspace_id) {
      throw new Error("Project has no workspace for its GitHub connection.");
    }

    const accessToken = await getUsableGitHubAccessToken(project.workspace_id);
    const branch = await ensureGitHubBranchAtBase(
      accessToken,
      run.repository_full_name,
      run.base_branch,
      run.working_branch
    );

    const { error: completeError } = await supabase.rpc(
      "complete_source_control_branch_creation",
      {
        p_run_id: run.id,
        p_worker_id: workerId,
        p_expected_revision: run.revision,
        p_base_sha: branch.baseSha
      }
    );
    if (completeError) throw completeError;

    console.log(
      `[${workerId}] source-control run ${run.id} branch ${branch.created ? "created" : "reconciled"} at ${branch.baseSha}`
    );
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
