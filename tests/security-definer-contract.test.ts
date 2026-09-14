import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("privileged RPC security contract", () => {
  it("keeps the audited authenticated SECURITY DEFINER inventory explicit", () => {
    const audit = readRepoFile("docs/SECURITY-DEFINER-AUDIT.md");
    const functions = [
      "apply_project_sync_patch",
      "approve_project_spec",
      "create_operate_lead_intake_token",
      "create_project_with_workspace",
      "ensure_personal_workspace",
      "get_project_sync_state",
      "is_project_member",
      "is_workspace_member",
      "queue_build_job",
      "register_project_bridge_device",
      "request_project_deployment",
      "restore_project_version",
      "revoke_operate_lead_intake_token",
      "save_project_plan",
      "select_visual_concept",
      "set_project_repository_binding",
    ];

    expect(audit).toContain("flags 16 functions");
    for (const functionName of functions) {
      expect(audit).toContain(`\`${functionName}\``);
    }
  });

  it("keeps deployment workers restricted away from browser roles", () => {
    const sql = readRepoFile("supabase/migrations/0005_deployment_orchestration.sql");

    expect(sql).toContain(
      "revoke all on function public.claim_next_deployment(text, integer)\nfrom public, anon, authenticated;",
    );
    expect(sql).toContain(
      "grant execute on function public.claim_next_deployment(text, integer)\nto service_role;",
    );
  });

  it("keeps source-control workers restricted away from browser roles", () => {
    const workerMigrations = [
      "supabase/migrations/0013_source_control_worker_leases.sql",
      "supabase/migrations/0014_source_control_changes_worker.sql",
      "supabase/migrations/0015_source_control_pull_request_worker.sql",
    ];

    for (const path of workerMigrations) {
      const sql = readRepoFile(path);
      expect(sql).toContain("from public, anon, authenticated;");
      expect(sql).toContain("to service_role;");
    }
  });

  it("documents that service_role credentials never belong in browsers or community forks", () => {
    const contract = readRepoFile("docs/SUPABASE-SECURITY-CONTRACT.md");

    expect(contract).toContain(
      "`service_role` access is reserved for trusted server/worker code and must never be exposed to browser code or community forks.",
    );
    expect(contract).toContain(
      "Outside contributors build with their own Supabase projects and fake development data.",
    );
  });
});
