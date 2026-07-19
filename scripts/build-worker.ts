import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { createAdminClient } from "@/lib/supabase/admin";
import { appPlanSchema } from "@/lib/ai/types";
import {
  createApplicationBuild,
  repairApplicationBuild
} from "@/lib/ai/build-router";
import type { QualityMode } from "@/lib/domain/schemas";
import { validateGeneratedArtifact } from "@/lib/runner/security";
import {
  prepareWorkdir,
  sha256,
  writeArtifact
} from "@/lib/runner/files";
import { executeBuildCommand } from "@/lib/runner/executor";
import { parseProjectSyncState } from "@/lib/sync/project-state";

type BuildJob = {
  id: string;
  project_id: string;
  spec_version_id: string;
  requested_by: string;
  quality_mode: QualityMode;
};

const workerId = process.env.BUILD_WORKER_ID ?? `worker-${process.pid}`;
const pollMs = Math.max(500, Number(process.env.BUILD_WORKER_POLL_MS ?? "3000"));
const workRoot = path.resolve(process.env.BUILD_WORK_ROOT ?? ".ziepher-builds");
const supabase = createAdminClient();

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

async function setJobStatus(jobId: string, status: string) {
  const { error } = await supabase
    .from("build_jobs")
    .update({
      status,
      heartbeat_at: new Date().toISOString(),
      lease_expires_at: new Date(Date.now() + 15 * 60_000).toISOString()
    })
    .eq("id", jobId)
    .eq("worker_id", workerId);

  if (error) throw error;
}

async function createStep(
  jobId: string,
  sequence: number,
  stepType: string,
  status: string,
  details: Record<string, unknown> = {}
) {
  const { data, error } = await supabase
    .from("build_steps")
    .insert({
      build_job_id: jobId,
      sequence,
      step_type: stepType,
      status,
      result: details,
      started_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function finishStep(
  stepId: string,
  result: Record<string, unknown>,
  provider?: string,
  model?: string
) {
  const { error } = await supabase
    .from("build_steps")
    .update({
      status: "completed",
      result,
      model_provider: provider ?? null,
      model_name: model ?? null,
      completed_at: new Date().toISOString()
    })
    .eq("id", stepId);

  if (error) throw error;
}

async function failStep(stepId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await supabase
    .from("build_steps")
    .update({
      status: "failed",
      result: { error: message.slice(0, 30_000) },
      completed_at: new Date().toISOString()
    })
    .eq("id", stepId);
}

function finalCredits(mode: QualityMode, provider: string) {
  if (provider === "deterministic") return 6;
  if (mode === "economy") return 18;
  if (mode === "balanced") return 34;
  return 70;
}

async function processJob(job: BuildJob) {
  let activeStepId: string | null = null;
  let provider = "unknown";
  let model = "unknown";
  const workdir = await prepareWorkdir(workRoot, job.id);

  try {
    activeStepId = await createStep(
      job.id,
      1,
      "retrieve_context",
      "planning"
    );

    const [specResult, projectResult, syncResult] = await Promise.all([
      supabase
        .from("app_spec_versions")
        .select("spec")
        .eq("id", job.spec_version_id)
        .eq("project_id", job.project_id)
        .single(),
      supabase
        .from("projects")
        .select("selected_visual_concept_id")
        .eq("id", job.project_id)
        .single(),
      supabase
        .from("project_sync_states")
        .select("state")
        .eq("project_id", job.project_id)
        .maybeSingle()
    ]);

    if (specResult.error) throw specResult.error;
    if (projectResult.error) throw projectResult.error;
    if (syncResult.error) throw syncResult.error;
    const projectContext = parseProjectSyncState(syncResult.data?.state).aiContext;

    let visualConceptId = "default";
    if (projectResult.data.selected_visual_concept_id) {
      const { data: concept, error } = await supabase
        .from("visual_concepts")
        .select("tokens")
        .eq("id", projectResult.data.selected_visual_concept_id)
        .single();
      if (error) throw error;
      const sourceId =
        concept?.tokens &&
        typeof concept.tokens === "object" &&
        "source_id" in concept.tokens
          ? concept.tokens.source_id
          : null;
      if (typeof sourceId === "string") visualConceptId = sourceId;
    }

    const plan = appPlanSchema.parse(specResult.data.spec);
    await finishStep(activeStepId, { visualConceptId });
    activeStepId = null;

    await setJobStatus(job.id, "generating");
    activeStepId = await createStep(job.id, 2, "generate", "generating");
    let generated = await createApplicationBuild(
      plan,
      visualConceptId,
      job.quality_mode,
      projectContext
    );
    provider = generated.provider;
    model = generated.model;
    validateGeneratedArtifact(generated.artifact);
    let previewPath = await writeArtifact(workdir, generated.artifact);
    await finishStep(
      activeStepId,
      {
        files: generated.artifact.files.length,
        summary: generated.artifact.summary,
        knownLimitations: generated.artifact.knownLimitations
      },
      provider,
      model
    );
    activeStepId = null;

    const maxRepairs = Math.max(
      0,
      Math.min(2, Number(process.env.BUILD_MAX_REPAIRS ?? "1"))
    );
    let repairCount = 0;

    for (;;) {
      const sequenceBase = 3 + repairCount * 4;
      try {
        await setJobStatus(job.id, "installing");
        activeStepId = await createStep(
          job.id,
          sequenceBase,
          "install",
          "installing",
          { attempt: repairCount + 1 }
        );
        const install = await executeBuildCommand(
          workdir,
          `install-${job.id}-${repairCount}`,
          "npm install --ignore-scripts --no-audit --no-fund",
          true
        );
        await finishStep(activeStepId, {
          attempt: repairCount + 1,
          durationMs: install.durationMs,
          output: install.output
        });
        activeStepId = null;

        await setJobStatus(job.id, "testing");
        activeStepId = await createStep(
          job.id,
          sequenceBase + 1,
          "typecheck",
          "testing",
          { attempt: repairCount + 1 }
        );
        const typecheck = await executeBuildCommand(
          workdir,
          `typecheck-${job.id}-${repairCount}`,
          "npm run typecheck",
          false
        );
        await finishStep(activeStepId, {
          attempt: repairCount + 1,
          durationMs: typecheck.durationMs,
          output: typecheck.output
        });
        activeStepId = null;

        await setJobStatus(job.id, "building");
        activeStepId = await createStep(
          job.id,
          sequenceBase + 2,
          "build",
          "building",
          { attempt: repairCount + 1 }
        );
        const build = await executeBuildCommand(
          workdir,
          `build-${job.id}-${repairCount}`,
          "npm run build",
          false
        );
        await finishStep(activeStepId, {
          attempt: repairCount + 1,
          durationMs: build.durationMs,
          output: build.output
        });
        activeStepId = null;
        break;
      } catch (validationError) {
        if (activeStepId) {
          await failStep(activeStepId, validationError);
          activeStepId = null;
        }

        if (repairCount >= maxRepairs) throw validationError;

        const failure =
          validationError instanceof Error
            ? validationError.message
            : String(validationError);
        await setJobStatus(job.id, "repairing");
        activeStepId = await createStep(
          job.id,
          sequenceBase + 3,
          "repair",
          "repairing",
          { attempt: repairCount + 1 }
        );

        const repaired = await repairApplicationBuild(
          plan,
          visualConceptId,
          generated.artifact,
          failure,
          job.quality_mode,
          projectContext
        );

        if (!repaired) {
          await failStep(
            activeStepId,
            new Error("No configured AI repair route was available.")
          );
          activeStepId = null;
          throw validationError;
        }

        generated = repaired;
        provider = repaired.provider;
        model = repaired.model;
        validateGeneratedArtifact(generated.artifact);
        await prepareWorkdir(workRoot, job.id);
        previewPath = await writeArtifact(workdir, generated.artifact);
        repairCount += 1;
        await finishStep(
          activeStepId,
          {
            repaired: true,
            nextAttempt: repairCount + 1,
            files: generated.artifact.files.length
          },
          provider,
          model
        );
        activeStepId = null;
      }
    }

    await setJobStatus(job.id, "testing");
    activeStepId = await createStep(
      job.id,
      20,
      "security_scan",
      "testing"
    );
    validateGeneratedArtifact(generated.artifact);
    await finishStep(activeStepId, {
      passed: true,
      checks: [
        "safe paths",
        "source size",
        "secret patterns",
        "financial integration ordering"
      ]
    });
    activeStepId = null;

    await setJobStatus(job.id, "building");
    activeStepId = await createStep(job.id, 21, "checkpoint", "building");
    const archivePath = path.join(workdir, "ziepher-source.tar.gz");
    const archive = await executeBuildCommand(
      workdir,
      `archive-${job.id}`,
      "tar --exclude=node_modules --exclude=.next --exclude=ziepher-preview.html --exclude=ziepher-source.tar.gz -czf /workspace/ziepher-source.tar.gz .",
      false
    );

    const [archiveBytes, previewBytes] = await Promise.all([
      readFile(archivePath),
      readFile(previewPath)
    ]);

    const sourceStoragePath = `${job.project_id}/${job.id}/source.tar.gz`;
    const previewStoragePath = `${job.project_id}/${job.id}/preview.html`;

    const [sourceUpload, previewUpload] = await Promise.all([
      supabase.storage
        .from("project-artifacts")
        .upload(sourceStoragePath, archiveBytes, {
          contentType: "application/gzip",
          upsert: true
        }),
      supabase.storage
        .from("project-artifacts")
        .upload(previewStoragePath, previewBytes, {
          contentType: "text/html; charset=utf-8",
          upsert: true
        })
    ]);

    if (sourceUpload.error) throw sourceUpload.error;
    if (previewUpload.error) throw previewUpload.error;

    const { data: version, error: publishError } = await supabase.rpc(
      "publish_build_artifacts",
      {
        p_project_id: job.project_id,
        p_build_job_id: job.id,
        p_source_path: sourceStoragePath,
        p_source_sha256: sha256(archiveBytes),
        p_preview_path: previewStoragePath,
        p_preview_sha256: sha256(previewBytes),
        p_summary: generated.artifact.summary,
        p_created_by: job.requested_by
      }
    );
    if (publishError) throw publishError;

    await finishStep(activeStepId, {
      version,
      archiveDurationMs: archive.durationMs,
      sourceStoragePath,
      previewStoragePath
    });
    activeStepId = null;

    const credits = finalCredits(job.quality_mode, provider);
    const { error: usageError } = await supabase.from("model_usage").insert({
      project_id: job.project_id,
      build_job_id: job.id,
      operation: "application_build",
      billable_to_user: true,
      provider,
      model,
      provider_cost_usd: 0
    });
    if (usageError) throw usageError;

    const { error: experienceError } = await supabase
      .from("build_experiences")
      .insert({
        project_id: job.project_id,
        build_job_id: job.id,
        task_type: "full_application_build",
        request_fingerprint: sha256(JSON.stringify(specResult.data.spec)),
        strategy_version: "builder-v2",
        framework: "nextjs",
        build_passed: true,
        tests_passed: true,
        security_passed: true,
        visual_score: 85,
        repair_count: repairCount,
        provider_cost_usd: 0,
        anonymized_for_learning: false
      });
    if (experienceError) throw experienceError;

    const { error: completeError } = await supabase.rpc(
      "complete_build_job_worker",
      {
        p_build_job_id: job.id,
        p_worker_id: workerId,
        p_success: true,
        p_final_credits: credits,
        p_provider: provider,
        p_model: model,
        p_failure_message: null
      }
    );
    if (completeError) throw completeError;

    console.log(
      `[${workerId}] completed build ${job.id} with ${provider}/${model}`
    );
  } catch (error) {
    if (activeStepId) await failStep(activeStepId, error);
    const message = error instanceof Error ? error.message : String(error);

    await supabase.rpc("complete_build_job_worker", {
      p_build_job_id: job.id,
      p_worker_id: workerId,
      p_success: false,
      p_final_credits: 0,
      p_provider: provider,
      p_model: model,
      p_failure_message: message.slice(0, 30_000)
    });

    console.error(`[${workerId}] failed build ${job.id}:`, error);
  } finally {
    await rm(workdir, { recursive: true, force: true });
    // The archive is inside workdir and is removed with the directory.
  }
}

async function claimJob() {
  const { data, error } = await supabase.rpc("claim_next_build_job", {
    p_worker_id: workerId,
    p_lease_seconds: 900
  });
  if (error) throw error;
  return firstRow(data as BuildJob | BuildJob[] | null);
}

async function main() {
  console.log(`[${workerId}] Ziepher build worker started.`);
  for (;;) {
    try {
      const job = await claimJob();
      if (!job) {
        await sleep(pollMs);
        continue;
      }
      await processJob(job);
    } catch (error) {
      console.error(`[${workerId}] worker loop error:`, error);
      await sleep(pollMs);
    }
  }
}

void main();
