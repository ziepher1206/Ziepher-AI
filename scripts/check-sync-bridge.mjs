import { access, readFile } from "node:fs/promises";

const required = [
  "supabase/migrations/0007_project_sync_bridge.sql",
  "app/api/projects/[projectId]/sync/route.ts",
  "app/api/projects/[projectId]/context/route.ts",
  "app/api/projects/[projectId]/bridge/route.ts",
  "hooks/use-project-sync.ts",
  "lib/ai/project-context.ts",
  "lib/bridge/desktop.ts",
  "docs/PROJECT-SYNC-BRIDGE.md"
];

await Promise.all(required.map((file) => access(file)));

const [migration, desktop, syncHook, planningPrompt, buildPrompt] =
  await Promise.all([
    readFile("supabase/migrations/0007_project_sync_bridge.sql", "utf8"),
    readFile("clients/desktop/src-tauri/src/lib.rs", "utf8"),
    readFile("hooks/use-project-sync.ts", "utf8"),
    readFile("lib/ai/prompts.ts", "utf8"),
    readFile("lib/ai/build-prompts.ts", "utf8")
  ]);

for (const contract of [
  "project_sync_states",
  "project_sync_events",
  "apply_project_sync_patch",
  "register_project_bridge_device",
  "enable row level security",
  "supabase_realtime"
]) {
  if (!migration.includes(contract)) {
    throw new Error(`Project sync migration contract is missing: ${contract}`);
  }
}

for (const safetyContract of [
  "Component::ParentDir",
  "is_symlink",
  "expected_sha256",
  ".ziepher",
  "MAX_TEXT_FILE_BYTES",
  "blocking_pick_folder"
]) {
  if (!desktop.includes(safetyContract)) {
    throw new Error(`Desktop bridge safety contract is missing: ${safetyContract}`);
  }
}

if (/struct WorkspaceSelection\s*\{[^}]*root:/s.test(desktop)) {
  throw new Error("Desktop bridge must not return the approved absolute root to web code.");
}

for (const recoveryContract of ["localStorage", "postgres_changes", "409", "15_000"]) {
  if (!syncHook.includes(recoveryContract)) {
    throw new Error(`Live sync recovery contract is missing: ${recoveryContract}`);
  }
}

if (
  !planningPrompt.includes("DURABLE PROJECT CONTEXT") ||
  !buildPrompt.includes("DURABLE PROJECT CONTEXT")
) {
  throw new Error("AI planning and build prompts must include durable project context.");
}

console.log("Project sync, AI context, and desktop bridge contracts verified.");
