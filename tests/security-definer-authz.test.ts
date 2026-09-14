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
});
