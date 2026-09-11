import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { getUsableGitHubAccessToken } from "@/lib/provider-connections/github-oauth";
import { sha256 } from "@/lib/runner/files";
import {
  assertSafeRepositoryFilePath,
  commitGitHubTextFiles,
  createGitHubBranch,
  findOpenGitHubPullRequest,
  getGitHubRefSha,
  getGitHubRefShaIfExists,
  getGitHubTextFile,
  openGitHubPullRequest
} from "@/lib/source-control/github";
import {
  createSourceControlBuildMarker,
  sourceControlBuildMarkerMatches,
  type SourceControlBuildMarker
} from "@/lib/source-control/build-marker";
import {
  bindSourceControlBaseSha,
  claimNextSourceControlRun,
  heartbeatSourceControlRun,
  scheduleSourceControlRetry,
  transitionSourceControlRun,
  type SourceControlRun
} from "@/lib/source-control/store";
import { createAdminClient } from "@/lib/supabase/admin";

const execFileAsync = promisify(execFile);
const supabase = createAdminClient();
const workerId = process.env.SOURCE_CONTROL_WORKER_ID ?? `source-control-${process.pid}`;
const pollMs = Math.max(
  1000,
  Number(process.env.SOURCE_CONTROL_WORKER_POLL_MS ?? "5000")
);
const maxAttempts = Math.max(
  1,
  Math.min(20, Number(process.env.SOURCE_CONTROL_MAX_ATTEMPTS ?? "5"))
);
const leaseSeconds = Math.max(
  60,
  Math.min(3600, Number(process.env.SOURCE_CONTROL_LEASE_SECONDS ?? "600"))
);

function requiredSourceIdentity(run: SourceControlRun) {
  if (!run.build_job_id || !run.source_storage_path || !run.source_sha256) {
    throw new Error("Source-control run is missing its validated build artifact identity.");
  }
  if (!/^[a-f0-9]{64}$/.test(run.source_sha256)) {
    throw new Error("Source-control run has an invalid source artifact SHA-256.");
  }
  return {
    buildJobId: run.build_job_id,
    sourceStoragePath: run.source_storage_path,
    sourceSha256: run.source_sha256
  };
}

function markerFor(run: SourceControlRun): SourceControlBuildMarker {
  const source = requiredSourceIdentity(run);
  return {
    schemaVersion: 1,
    projectId: run.project_id,
    buildJobId: source.buildJobId,
    sourceSha256: source.sourceSha256,
    repositoryFullName: run.repository_full_name,
    baseBranch: run.base_branch
  };
}

function validateArchiveEntry(entry: string) {
  const normalized = entry.replace(/^\.\//, "");
  if (!normalized || normalized.endsWith("/")) return null;
  const clean = assertSafeRepositoryFilePath(normalized);
  if (clean === ".git" || clean.startsWith(".git/")) {
    throw new Error("Source archive contains reserved Git metadata.");
  }
  if (clean === ".ziepher" || clean.startsWith(".ziepher/")) {
    throw new Error("Source archive uses Ziepher's reserved metadata namespace.");
  }
  return clean;
}

async function collectTextFiles(root: string) {
  const result: Array<{ path: string; content: string }> = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });

  async function walk(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      const clean = assertSafeRepositoryFilePath(relative);
      if (clean === ".git" || clean.startsWith(".git/")) {
        throw new Error("Extracted source contains reserved Git metadata.");
      }
      if (clean === ".ziepher" || clean.startsWith(".ziepher/")) {
        throw new Error("Extracted source uses Ziepher's reserved metadata namespace.");
      }

      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(`Source archive contains a non-regular file: ${clean}`);
      }

      const bytes = await readFile(absolute);
      let content: string;
      try {
        content = decoder.decode(bytes);
      } catch {
        throw new Error(`Source archive contains a non-UTF-8 file: ${clean}`);
      }
      result.push({ path: clean, content });
      if (result.length > 299) {
        throw new Error("Source archive contains too many files for a guarded commit.");
      }
    }
  }

  await walk(root);
  return result;
}

async function loadValidatedSourceFiles(run: SourceControlRun) {
  const source = requiredSourceIdentity(run);
  const { data, error } = await supabase.storage
    .from("project-artifacts")
    .download(source.sourceStoragePath);
  if (error || !data) {
    throw new Error(`Could not download validated source artifact: ${error?.message ?? "missing data"}`);
  }

  const archiveBytes = Buffer.from(await data.arrayBuffer());
  if (sha256(archiveBytes) !== source.sourceSha256) {
    throw new Error("Validated source artifact SHA-256 no longer matches its source-control run.");
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ziepher-source-control-"));
  const archivePath = path.join(tempRoot, "source.tar.gz");
  const sourceRoot = path.join(tempRoot, "source");

  try {
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(archivePath, archiveBytes);

    const listing = await execFileAsync("tar", ["-tzf", archivePath], {
      maxBuffer: 2_000_000
    });
    for (const entry of listing.stdout.split("\n")) {
      if (entry.trim()) validateArchiveEntry(entry.trim());
    }

    await execFileAsync(
      "tar",
      [
        "--no-same-owner",
        "--no-same-permissions",
        "-xzf",
        archivePath,
        "-C",
        sourceRoot
      ],
      { maxBuffer: 2_000_000 }
    );

    const files = await collectTextFiles(sourceRoot);
    files.push({
      path: ".ziepher/build.json",
      content: createSourceControlBuildMarker(markerFor(run))
    });
    return files;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function loadProject(run: SourceControlRun) {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,workspace_id")
    .eq("id", run.project_id)
    .single();
  if (error || !data) {
    throw new Error(`Could not load source-control project: ${error?.message ?? "not found"}`);
  }
  if (!data.workspace_id) {
    throw new Error("Source-control project has no workspace for GitHub authorization.");
  }
  return data as { id: string; name: string; workspace_id: string };
}

async function processRun(initialRun: SourceControlRun) {
  let run = initialRun;
  const project = await loadProject(run);
  const accessToken = await getUsableGitHubAccessToken(project.workspace_id);
  const expectedMarker = markerFor(run);

  try {
    if (run.stage === "queued") {
      if (!run.base_sha) {
        const baseSha = await getGitHubRefSha(
          accessToken,
          run.repository_full_name,
          run.base_branch
        );
        run = await bindSourceControlBaseSha(run, baseSha);
      }

      await heartbeatSourceControlRun(run.id, workerId, leaseSeconds);
      const existingBranchSha = await getGitHubRefShaIfExists(
        accessToken,
        run.repository_full_name,
        run.working_branch
      );

      if (existingBranchSha === null) {
        await createGitHubBranch(
          accessToken,
          run.repository_full_name,
          run.working_branch,
          run.base_sha!
        );
      } else if (existingBranchSha !== run.base_sha) {
        run = await transitionSourceControlRun(run, "blocked", {
          blockedReason: "The working branch already exists at an unexpected commit.",
          lastError: "Branch identity did not match the snapshotted base SHA."
        });
        return run;
      }

      run = await transitionSourceControlRun(run, "branch_created", {
        headSha: run.base_sha!
      });
    }

    if (run.stage === "branch_created") {
      await heartbeatSourceControlRun(run.id, workerId, leaseSeconds);
      const currentHead = await getGitHubRefShaIfExists(
        accessToken,
        run.repository_full_name,
        run.working_branch
      );
      if (!currentHead) {
        return transitionSourceControlRun(run, "blocked", {
          blockedReason: "The source-control working branch disappeared.",
          lastError: "Working branch was not found during source commit."
        });
      }

      let generatedHead: string;
      if (currentHead === run.base_sha) {
        const files = await loadValidatedSourceFiles(run);
        generatedHead = await commitGitHubTextFiles(
          accessToken,
          run.repository_full_name,
          run.working_branch,
          currentHead,
          files,
          `Ziepher build ${run.build_job_id}`
        );
      } else {
        const marker = await getGitHubTextFile(
          accessToken,
          run.repository_full_name,
          run.working_branch,
          ".ziepher/build.json"
        );
        if (!sourceControlBuildMarkerMatches(marker, expectedMarker)) {
          return transitionSourceControlRun(run, "blocked", {
            blockedReason: "The working branch changed outside the recorded Ziepher build.",
            lastError: "Could not prove the existing branch head belongs to this build checkpoint."
          });
        }
        generatedHead = currentHead;
      }

      run = await transitionSourceControlRun(run, "changes_ready", {
        headSha: generatedHead
      });
    }

    if (run.stage === "changes_ready") {
      await heartbeatSourceControlRun(run.id, workerId, leaseSeconds);
      const currentHead = await getGitHubRefShaIfExists(
        accessToken,
        run.repository_full_name,
        run.working_branch
      );
      if (!currentHead || currentHead !== run.head_sha) {
        return transitionSourceControlRun(run, "blocked", {
          blockedReason: "The prepared source branch moved before pull-request creation.",
          lastError: "Working branch head no longer matches the durable source-control run."
        });
      }

      let pullRequest = await findOpenGitHubPullRequest(
        accessToken,
        run.repository_full_name,
        { head: run.working_branch, base: run.base_branch }
      );

      if (pullRequest && pullRequest.headSha !== currentHead) {
        return transitionSourceControlRun(run, "blocked", {
          blockedReason: "An existing pull request points at an unexpected branch head.",
          lastError: "Pull-request head SHA did not match the durable source-control run."
        });
      }

      if (!pullRequest) {
        pullRequest = await openGitHubPullRequest(
          accessToken,
          run.repository_full_name,
          {
            head: run.working_branch,
            base: run.base_branch,
            title: `Ziepher build: ${project.name}`.slice(0, 240),
            body: [
              "Generated by the Ziepher guarded build pipeline.",
              "",
              `Build job: ${run.build_job_id}`,
              `Source SHA-256: ${run.source_sha256}`,
              "",
              "This pull request is not approved for production merge automatically."
            ].join("\n")
          }
        );
      }

      if (pullRequest.headSha !== currentHead) {
        return transitionSourceControlRun(run, "blocked", {
          blockedReason: "GitHub returned a pull request for an unexpected source head.",
          lastError: "Pull-request creation did not preserve the expected head SHA."
        });
      }

      run = await transitionSourceControlRun(run, "pull_request_open", {
        pullRequestNumber: pullRequest.number,
        headSha: currentHead
      });
    }

    return run;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (run.attempt_count >= maxAttempts) {
      try {
        return await transitionSourceControlRun(run, "blocked", {
          blockedReason: "Source-control automation needs operator attention.",
          lastError: message
        });
      } catch (transitionError) {
        console.error(
          `[${workerId}] could not block source-control run ${run.id}:`,
          transitionError
        );
        throw error;
      }
    }

    await scheduleSourceControlRetry(
      run,
      message,
      Math.min(60 * 2 ** Math.max(0, run.attempt_count - 1), 900)
    );
    return run;
  }
}

async function main() {
  console.log(`[${workerId}] Ziepher source-control worker started.`);
  for (;;) {
    try {
      const run = await claimNextSourceControlRun(workerId, leaseSeconds);
      if (!run) {
        await sleep(pollMs);
        continue;
      }
      const result = await processRun(run);
      console.log(
        `[${workerId}] source-control run ${run.id} reached ${result.stage}`
      );
    } catch (error) {
      console.error(`[${workerId}] source-control worker loop error:`, error);
      await sleep(pollMs);
    }
  }
}

void main();
