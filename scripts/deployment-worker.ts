import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
  classifyVercelDeployment,
  findVercelDeploymentByZiepherId,
  type VercelDeploymentObservation
} from "@/lib/deployment/vercel-deployments";
import { getUsableVercelConnection } from "@/lib/provider-connections/vercel";
import { createAdminClient } from "@/lib/supabase/admin";

type DeploymentJob = {
  id: string;
  project_id: string;
  project_version_id: string;
  requested_by: string;
  provider: "vercel" | "manual";
  environment: "preview" | "production";
  vercel_project_id: string | null;
  vercel_project_name: string | null;
  vercel_org_id: string | null;
  provider_attempted_at: string | null;
  provider_reconcile_attempts: number;
};

type CommandResult = {
  stdout: string;
  stderr: string;
};

const workerId =
  process.env.DEPLOYMENT_WORKER_ID ?? `deployment-worker-${process.pid}`;
const pollMs = Math.max(
  500,
  Number(process.env.DEPLOYMENT_WORKER_POLL_MS ?? "5000")
);
const maxReconcileAttempts = 20;
const supabase = createAdminClient();

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

function boundedAppend(current: string, next: string) {
  const combined = current + next;
  return combined.length > 120_000 ? combined.slice(-120_000) : combined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  extraEnv: Record<string, string | undefined> = {},
  timeoutMs = 15 * 60_000
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, {
      cwd,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? os.tmpdir(),
        NODE_ENV: "production",
        CI: "1",
        NO_COLOR: "1",
        ...extraEnv
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = boundedAppend(stdout, chunk.toString("utf8"));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = boundedAppend(stderr, chunk.toString("utf8"));
    });

    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${command} failed with code ${String(code)} and signal ${String(signal)}.\n${stderr || stdout}`
        )
      );
    });
  });
}

function validateArchiveListing(listing: string) {
  const entries = listing
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!entries.length) throw new Error("Source archive is empty.");
  if (entries.length > 5000) {
    throw new Error("Source archive contains too many files.");
  }

  for (const entry of entries) {
    const normalized = path.posix.normalize(entry.replace(/^\.\//, ""));
    if (
      normalized === ".." ||
      normalized.startsWith("../") ||
      normalized.startsWith("/") ||
      normalized.includes("\\")
    ) {
      throw new Error(`Unsafe archive entry: ${entry}`);
    }
  }
}

async function complete(
  job: DeploymentJob,
  success: boolean,
  providerDeploymentId: string | null,
  url: string | null,
  failureMessage: string | null
) {
  const { error } = await supabase.rpc("complete_deployment_worker", {
    p_deployment_id: job.id,
    p_worker_id: workerId,
    p_success: success,
    p_provider_deployment_id: providerDeploymentId,
    p_url: url,
    p_failure_message: failureMessage
  });
  if (error) throw error;
}

async function markProviderAttempt(job: DeploymentJob) {
  const { error } = await supabase.rpc("mark_deployment_provider_attempt", {
    p_deployment_id: job.id,
    p_worker_id: workerId
  });
  if (error) throw error;
}

async function rescheduleReconciliation(
  job: DeploymentJob,
  observedState: string,
  message: string
) {
  const { error } = await supabase.rpc("reschedule_deployment_reconciliation", {
    p_deployment_id: job.id,
    p_worker_id: workerId,
    p_delay_seconds: 30,
    p_observed_state: observedState,
    p_failure_message: message.slice(0, 30_000)
  });
  if (error) throw error;
}

async function requireVercelRuntime(job: DeploymentJob) {
  if (process.env.VERCEL_DEPLOYMENTS_ENABLED !== "true") {
    throw new Error(
      "Vercel deployment is disabled. Set VERCEL_DEPLOYMENTS_ENABLED=true after connecting Vercel for the workspace."
    );
  }

  if (!job.vercel_project_id || !job.vercel_project_name || !job.vercel_org_id) {
    throw new Error(
      "Vercel deployment is missing its immutable project target snapshot. Requeue after binding the Ziepher project to Vercel."
    );
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", job.project_id)
    .single();
  if (error) throw error;
  if (!project?.workspace_id) {
    throw new Error("The deployment project has no workspace Vercel connection.");
  }

  const connection = await getUsableVercelConnection(project.workspace_id);
  if (connection.teamId && connection.teamId !== job.vercel_org_id) {
    throw new Error(
      "The connected Vercel team no longer matches the deployment target snapshot. Rebind the project before creating a new deployment."
    );
  }

  return {
    token: connection.accessToken,
    target: {
      projectId: job.vercel_project_id,
      orgId: job.vercel_org_id
    }
  };
}

async function observeVercelDeployment(job: DeploymentJob, token: string) {
  if (!job.vercel_project_id || !job.vercel_org_id) {
    throw new Error("Vercel deployment target snapshot is missing.");
  }

  return findVercelDeploymentByZiepherId(
    token,
    {
      projectId: job.vercel_project_id,
      orgId: job.vercel_org_id
    },
    job.id,
    job.project_id,
    job.environment
  );
}

async function finishObservedVercelDeployment(
  job: DeploymentJob,
  observation: VercelDeploymentObservation
) {
  const classification = classifyVercelDeployment(observation);

  if (classification === "ready") {
    if (!observation.url) {
      await rescheduleReconciliation(
        job,
        observation.state,
        "Vercel reports READY but has not exposed a deployment URL yet."
      );
      return;
    }
    await complete(job, true, observation.id, observation.url, null);
    console.log(
      `[${workerId}] reconciled deployment ${job.id} to ${observation.id} at ${observation.url}`
    );
    return;
  }

  if (classification === "failed") {
    await complete(
      job,
      false,
      observation.id,
      observation.url,
      `Vercel deployment ${observation.id} reached terminal state ${observation.state}.`
    );
    return;
  }

  await rescheduleReconciliation(
    job,
    observation.state,
    `Vercel deployment ${observation.id} is still ${observation.state}; waiting for provider completion.`
  );
}

async function invokeVercelDeploy(sourceDir: string, job: DeploymentJob, token: string) {
  if (!job.vercel_project_id || !job.vercel_org_id) {
    throw new Error("Vercel deployment target snapshot is missing.");
  }

  const args = [
    "--yes",
    "vercel@56.3.1",
    "deploy",
    "--yes",
    "--no-color",
    "--archive=tgz",
    "--meta",
    `ziepherDeploymentId=${job.id}`,
    "--meta",
    `ziepherProjectId=${job.project_id}`,
    "--meta",
    `ziepherEnvironment=${job.environment}`,
    "--token",
    token
  ];

  if (job.environment === "production") args.push("--prod");

  await runCommand(
    "npx",
    args,
    sourceDir,
    {
      VERCEL_PROJECT_ID: job.vercel_project_id,
      VERCEL_ORG_ID: job.vercel_org_id
    }
  );
}

async function materializeSourceArchive(
  tempRoot: string,
  sourceSnapshotPath: string
) {
  const { data: archiveBlob, error: downloadError } = await supabase.storage
    .from("project-artifacts")
    .download(sourceSnapshotPath);
  if (downloadError) throw downloadError;

  const archivePath = path.join(tempRoot, "source.tar.gz");
  const sourceDir = path.join(tempRoot, "source");
  await mkdir(sourceDir, { recursive: true });
  await writeFile(archivePath, Buffer.from(await archiveBlob.arrayBuffer()));

  const listing = await runCommand(
    "tar",
    ["-tzf", archivePath],
    tempRoot,
    {},
    60_000
  );
  validateArchiveListing(listing.stdout);

  await runCommand(
    "tar",
    ["-xzf", archivePath, "-C", sourceDir, "--no-same-owner", "--no-same-permissions"],
    tempRoot,
    {},
    60_000
  );

  return sourceDir;
}

async function processJob(job: DeploymentJob) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ziepher-deploy-"));
  let providerAttemptStarted = Boolean(job.provider_attempted_at);
  try {
    const { data: version, error: versionError } = await supabase
      .from("project_versions")
      .select("source_snapshot_path,version")
      .eq("id", job.project_version_id)
      .eq("project_id", job.project_id)
      .single();
    if (versionError) throw versionError;

    if (job.provider === "manual") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const url = `${appUrl}/api/projects/${job.project_id}/source`;
      await complete(job, true, `manual-v${version.version}`, url, null);
      return;
    }

    const { token } = await requireVercelRuntime(job);
    const existing = await observeVercelDeployment(job, token);
    if (existing) {
      await finishObservedVercelDeployment(job, existing);
      return;
    }

    if (providerAttemptStarted) {
      if (job.provider_reconcile_attempts >= maxReconcileAttempts) {
        await complete(
          job,
          false,
          null,
          null,
          "Vercel provider acceptance could not be reconciled after repeated authoritative lookups. No second deployment was created; manual review is required."
        );
        return;
      }

      await rescheduleReconciliation(
        job,
        "NOT_FOUND",
        "A Vercel deployment attempt was already started, but the provider record is not visible yet. No second deployment will be created automatically."
      );
      return;
    }

    const sourceDir = await materializeSourceArchive(
      tempRoot,
      version.source_snapshot_path
    );

    await markProviderAttempt(job);
    providerAttemptStarted = true;

    let cliError: string | null = null;
    try {
      await invokeVercelDeploy(sourceDir, job, token);
    } catch (error) {
      cliError = errorMessage(error);
    }

    let observedAfterAttempt: VercelDeploymentObservation | null = null;
    try {
      observedAfterAttempt = await observeVercelDeployment(job, token);
    } catch (error) {
      await rescheduleReconciliation(
        job,
        "NOT_FOUND",
        `Vercel deployment attempt was started but reconciliation failed: ${errorMessage(error)}`
      );
      return;
    }

    if (observedAfterAttempt) {
      await finishObservedVercelDeployment(job, observedAfterAttempt);
      return;
    }

    await rescheduleReconciliation(
      job,
      "NOT_FOUND",
      cliError
        ? `Vercel CLI returned an error after the provider attempt began: ${cliError}. Ziepher will reconcile before any retry.`
        : "Vercel CLI returned after the provider attempt began, but the deployment is not visible in the provider list yet. Ziepher will reconcile before any retry."
    );
  } catch (error) {
    const message = errorMessage(error);
    try {
      if (job.provider === "vercel" && providerAttemptStarted) {
        await rescheduleReconciliation(
          job,
          "NOT_FOUND",
          `Provider-side outcome is ambiguous; automatic redeploy is blocked until reconciliation succeeds: ${message}`
        );
      } else {
        await complete(job, false, null, null, message.slice(0, 30_000));
      }
    } catch (completionError) {
      console.error(
        `[${workerId}] could not finalize or reschedule deployment ${job.id}:`,
        completionError
      );
    }
    console.error(`[${workerId}] failed deployment ${job.id}:`, error);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function claimJob() {
  const { data, error } = await supabase.rpc("claim_next_deployment", {
    p_worker_id: workerId,
    p_lease_seconds: 900
  });
  if (error) throw error;
  return firstRow(data as DeploymentJob | DeploymentJob[] | null);
}

async function main() {
  console.log(`[${workerId}] Ziepher deployment worker started.`);
  for (;;) {
    try {
      const job = await claimJob();
      if (!job) {
        await sleep(pollMs);
        continue;
      }
      await processJob(job);
    } catch (error) {
      console.error(`[${workerId}] deployment loop error:`, error);
      await sleep(pollMs);
    }
  }
}

void main();
