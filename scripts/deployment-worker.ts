import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { createAdminClient } from "@/lib/supabase/admin";

type DeploymentJob = {
  id: string;
  project_id: string;
  project_version_id: string;
  requested_by: string;
  provider: "vercel" | "manual";
  environment: "preview" | "production";
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
const supabase = createAdminClient();

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

function boundedAppend(current: string, next: string) {
  const combined = current + next;
  return combined.length > 120_000 ? combined.slice(-120_000) : combined;
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

async function deployToVercel(sourceDir: string, job: DeploymentJob) {
  if (process.env.VERCEL_DEPLOYMENTS_ENABLED !== "true") {
    throw new Error(
      "Vercel deployment is disabled. Set VERCEL_DEPLOYMENTS_ENABLED=true after configuring a deployment token."
    );
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not configured.");

  const args = [
    "--yes",
    "vercel@56.3.1",
    "deploy",
    "--yes",
    "--no-color",
    "--archive=tgz",
    "--token",
    token
  ];

  if (process.env.VERCEL_TEAM_ID) {
    args.push("--scope", process.env.VERCEL_TEAM_ID);
  }
  if (job.environment === "production") args.push("--prod");

  const result = await runCommand("npx", args, sourceDir);
  const url = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reverse()
    .find((line) => /^https:\/\/.+/i.test(line));

  if (!url) {
    throw new Error(
      `Vercel completed without returning a deployment URL.\n${result.stderr}`
    );
  }

  return {
    id: url.replace(/^https?:\/\//, "").split(".")[0] ?? url,
    url
  };
}

async function processJob(job: DeploymentJob) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ziepher-deploy-"));
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

    const { data: archiveBlob, error: downloadError } = await supabase.storage
      .from("project-artifacts")
      .download(version.source_snapshot_path);
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

    const deployment = await deployToVercel(sourceDir, job);
    await complete(job, true, deployment.id, deployment.url, null);
    console.log(
      `[${workerId}] deployed ${job.id} to ${deployment.url}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await complete(job, false, null, null, message.slice(0, 30_000));
    } catch (completionError) {
      console.error(
        `[${workerId}] could not finalize failed deployment ${job.id}:`,
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
