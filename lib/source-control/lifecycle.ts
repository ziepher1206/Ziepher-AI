import { z } from "zod";

export const sourceControlStageSchema = z.enum([
  "queued",
  "branch_created",
  "changes_ready",
  "pull_request_open",
  "checks_running",
  "preview_ready",
  "approved",
  "merged",
  "production_verified",
  "blocked",
  "failed"
]);

export type SourceControlStage = z.infer<typeof sourceControlStageSchema>;

const transitions: Record<SourceControlStage, readonly SourceControlStage[]> = {
  queued: ["branch_created", "blocked", "failed"],
  branch_created: ["changes_ready", "blocked", "failed"],
  changes_ready: ["pull_request_open", "blocked", "failed"],
  pull_request_open: ["checks_running", "preview_ready", "blocked", "failed"],
  checks_running: ["checks_running", "preview_ready", "blocked", "failed"],
  preview_ready: ["approved", "checks_running", "blocked", "failed"],
  approved: ["merged", "blocked", "failed"],
  merged: ["production_verified", "blocked", "failed"],
  production_verified: [],
  blocked: ["queued", "branch_created", "changes_ready", "pull_request_open", "checks_running", "preview_ready", "failed"],
  failed: ["queued"]
};

export function canTransitionSourceControl(from: SourceControlStage, to: SourceControlStage) {
  return from === to || transitions[from].includes(to);
}

export function assertSourceControlTransition(from: SourceControlStage, to: SourceControlStage) {
  if (!canTransitionSourceControl(from, to)) {
    throw new Error(`Invalid source-control transition: ${from} -> ${to}`);
  }
}

export function createWorkingBranchName(projectId: string, runId: string) {
  const project = projectId.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12);
  const run = runId.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12);
  if (!project || !run) throw new Error("Project and run identifiers must contain letters or numbers.");
  return `ziepher/${project}/${run}`;
}

export function parseRepositoryFullName(value: string) {
  const parsed = z.string().trim().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).parse(value);
  const [owner, repo] = parsed.split("/");
  return { owner: owner!, repo: repo! };
}
