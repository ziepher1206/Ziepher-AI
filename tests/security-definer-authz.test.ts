import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("SECURITY DEFINER authorization source", () => {
  it("keeps repository binding restricted to authenticated owners or workspace admins", () => {
    const sql = readRepoFile(
      "supabase/applied-history/20260911_security_definer_authorization.sql",
    );

    expect(sql).toContain("create or replace function public.set_project_repository_binding");
    expect(sql).toContain("if auth.uid() is null then");
    expect(sql).toContain("v_project.owner_id <> auth.uid()");
    expect(sql).toContain("v_role not in ('owner', 'admin')");
    expect(sql).toContain(
      "revoke all on function public.set_project_repository_binding(uuid, text, text)",
    );
    expect(sql).toContain("from public, anon");
    expect(sql).toContain("to authenticated");
  });

  it("keeps production deployments owner/admin gated", () => {
    const sql = readRepoFile(
      "supabase/applied-history/20260911_security_definer_authorization.sql",
    );

    expect(sql).toContain("create or replace function public.request_project_deployment");
    expect(sql).toContain("if auth.uid() is null then");
    expect(sql).toContain("if not public.is_project_member(p_project_id) then");
    expect(sql).toContain("p_environment = 'production'");
    expect(sql).toContain("v_role not in ('owner', 'admin')");
    expect(sql).toContain(
      "revoke all on function public.request_project_deployment(uuid, integer, text, text)",
    );
    expect(sql).toContain("from public, anon");
  });

  it("keeps tree-service lead intake token management admin-only and non-anonymous", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260913235500_tree_service_phase2_public_lead_intake.sql",
    );

    expect(sql).toContain("create or replace function public.create_operate_lead_intake_token");
    expect(sql).toContain("create or replace function public.revoke_operate_lead_intake_token");
    expect(sql).toContain("Workspace administrator access required.");
    expect(sql).toContain(
      "revoke all on function public.create_operate_lead_intake_token(uuid,uuid,text,text,timestamptz) from public, anon",
    );
    expect(sql).toContain(
      "revoke all on function public.revoke_operate_lead_intake_token(uuid) from public, anon",
    );
    expect(sql).toContain(
      "grant execute on function public.create_operate_lead_intake_token(uuid,uuid,text,text,timestamptz) to authenticated",
    );
  });

  it("keeps core authenticated RPCs explicitly revoked from public and anon", () => {
    const sql = readRepoFile("supabase/migrations/0010_rpc_permission_hardening.sql");
    const guardedFunctions = [
      "ensure_personal_workspace()",
      "create_project_with_workspace(text, text)",
      "approve_project_spec(uuid, uuid)",
      "queue_build_job(uuid, uuid, public.quality_mode)",
      "restore_project_version(uuid, integer)",
      "request_project_deployment(uuid, integer, text, text)",
    ];

    for (const signature of guardedFunctions) {
      expect(sql).toContain(`revoke execute on function public.${signature} from public;`);
      expect(sql).toContain(`revoke execute on function public.${signature} from anon;`);
      expect(sql).toContain(`grant execute on function public.${signature} to authenticated;`);
    }
  });

  it("keeps project sync and bridge RPCs authenticated, member-scoped, and non-anonymous", () => {
    const sql = readRepoFile("supabase/migrations/0007_project_sync_bridge.sql");

    expect(sql).toContain("create or replace function public.get_project_sync_state");
    expect(sql).toContain("create or replace function public.apply_project_sync_patch");
    expect(sql).toContain("create or replace function public.register_project_bridge_device");
    expect(sql).toContain("if not public.is_project_member(p_project_id) then");
    expect(sql).toContain("if auth.uid() is null then");
    expect(sql).toContain(
      "revoke all on function public.get_project_sync_state(uuid)\nfrom public, anon",
    );
    expect(sql).toContain(
      "revoke all on function public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb)\nfrom public, anon",
    );
    expect(sql).toContain(
      "revoke all on function public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb)\nfrom public, anon",
    );
    expect(sql).toContain(
      "grant execute on function public.get_project_sync_state(uuid) to authenticated",
    );
    expect(sql).toContain(
      "grant execute on function public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb) to authenticated",
    );
    expect(sql).toContain(
      "grant execute on function public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb) to authenticated",
    );
  });

  it("keeps planning and visual-selection RPCs scoped to project members", () => {
    const sql = readRepoFile("supabase/migrations/0003_orchestration.sql");

    for (const functionName of [
      "save_project_plan",
      "select_visual_concept",
      "approve_project_spec",
    ]) {
      expect(sql).toContain(`create or replace function public.${functionName}`);
    }

    const membershipGuard = "if not public.is_project_member(p_project_id) then";
    const occurrences = sql.split(membershipGuard).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(3);
    expect(sql).toContain("raise exception 'Project access denied';");
    expect(sql).toContain("and project_id = p_project_id");
  });

  it("keeps build queuing scoped to a project member and that project's approved spec", () => {
    const sql = readRepoFile("supabase/migrations/0001_core.sql");

    expect(sql).toContain("create or replace function public.queue_build_job");
    expect(sql).toContain("if not public.is_project_member(p_project_id) then");
    expect(sql).toContain("raise exception 'Project access denied';");
    expect(sql).toContain("where id = p_spec_version_id");
    expect(sql).toContain("and project_id = p_project_id");
    expect(sql).toContain("and approved_at is not null");
    expect(sql).toContain("requested_by,");
    expect(sql).toContain("auth.uid(),");
  });

  it("keeps version restore scoped to a member and a version from the same project", () => {
    const sql = readRepoFile("supabase/migrations/0004_versions_billing.sql");

    expect(sql).toContain("create or replace function public.restore_project_version");
    expect(sql).toContain("if not public.is_project_member(p_project_id) then");
    expect(sql).toContain("raise exception 'Project access denied';");
    expect(sql).toContain("from public.project_versions");
    expect(sql).toContain("where project_id = p_project_id");
    expect(sql).toContain("and version = p_target_version");
    expect(sql).toContain("created_by");
    expect(sql).toContain("auth.uid()");
  });

  it("keeps workspace and project membership helpers bound to the authenticated caller", () => {
    const sql = readRepoFile("supabase/migrations/0001_core.sql");

    expect(sql).toContain("create or replace function public.is_workspace_member");
    expect(sql).toContain("create or replace function public.is_project_member");
    expect(sql).toContain("and wm.user_id = auth.uid()");
    expect(sql).toContain("w.owner_id = auth.uid()");
    expect(sql).toContain("p.owner_id = auth.uid()");
    expect(sql).toContain("or wm.user_id is not null");
  });

  it("keeps personal workspace and project creation authenticated and caller-owned", () => {
    const sql = readRepoFile("supabase/migrations/0003_orchestration.sql");

    expect(sql).toContain("create or replace function public.ensure_personal_workspace");
    expect(sql).toContain("if v_user_id is null then");
    expect(sql).toContain("raise exception 'Authentication required'");
    expect(sql).toContain("where w.owner_id = v_user_id");
    expect(sql).toContain("values (v_workspace_id, v_user_id, 'owner')");
    expect(sql).toContain("create or replace function public.create_project_with_workspace");
    expect(sql).toContain("if auth.uid() is null then");
    expect(sql).toContain("v_workspace_id := public.ensure_personal_workspace()");
    expect(sql).toContain("auth.uid(),");
  });

});
