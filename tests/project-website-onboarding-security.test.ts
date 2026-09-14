import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("website onboarding authorization", () => {
  it("creates website projects atomically through a dedicated authenticated RPC", () => {
    const route = readRepoFile("app/api/projects/route.ts");
    const migration = readRepoFile(
      "supabase/migrations/20260914175500_atomic_website_onboarding.sql",
    );

    expect(route).toContain('"create_website_project_with_workspace"');
    expect(route).not.toContain('.from("projects")\n        .update({');

    expect(migration).toContain(
      "create or replace function public.create_website_project_with_workspace",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("if auth.uid() is null then");
    expect(migration).toContain("business_name,");
    expect(migration).toContain("source_domain,");
    expect(migration).toContain("primary_domain,");
    expect(migration).toContain("website_connection_mode,");
    expect(migration).toContain("scan_status");
    expect(migration).toContain(
      "revoke all on function public.create_website_project_with_workspace(text, text, text, text)",
    );
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated, service_role");
  });

  it("does not reopen broad authenticated UPDATE access on projects", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260914175500_atomic_website_onboarding.sql",
    );

    expect(migration).not.toContain("grant update on table public.projects to authenticated");
    expect(migration).not.toContain("grant update on public.projects to authenticated");
  });
});
