import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("website scan authorization", () => {
  it("writes scan state through the guarded RPC instead of direct project updates", () => {
    const route = readRepoFile("app/api/projects/[projectId]/scan/route.ts");
    const migration = readRepoFile(
      "supabase/migrations/20260914182400_secure_project_scan_state.sql",
    );

    expect(route).toContain('supabase.rpc("set_project_scan_state"');
    expect(route).not.toContain('.from("projects")\n      .update({ scan_status: "scanning" })');
    expect(route).not.toContain('.from("projects")\n      .update({\n        scan_status: "complete"');

    expect(migration).toContain(
      "create or replace function public.set_project_scan_state",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("if auth.uid() is null then");
    expect(migration).toContain("if not public.is_project_member(p_project_id) then");
    expect(migration).toContain("revoke all on function public.set_project_scan_state");
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated, service_role");
  });
});
