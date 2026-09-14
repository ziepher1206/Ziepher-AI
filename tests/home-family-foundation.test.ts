import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260914232000_home_family_foundation.sql",
  "utf8",
);
const actions = readFileSync("app/home/actions.ts", "utf8");
const page = readFileSync("app/home/page.tsx", "utf8");
const modules = readFileSync("lib/zlife/modules.ts", "utf8");

describe("Z-Life Home & Family foundation", () => {
  it("creates tenant-scoped task and maintenance storage with RLS", () => {
    expect(migration).toContain("create table if not exists public.home_tasks");
    expect(migration).toContain("create table if not exists public.home_maintenance_items");
    expect(migration).toContain("references public.workspaces(id) on delete cascade");
    expect(migration).toContain("alter table public.home_tasks enable row level security");
    expect(migration).toContain("alter table public.home_maintenance_items enable row level security");
    expect(migration).toContain("public.is_workspace_member(workspace_id)");
    expect(migration).toContain("created_by = (select auth.uid())");
  });

  it("derives the workspace and user on the server rather than trusting form input", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain('supabase.auth.getUser()');
    expect(actions).toContain('supabase.rpc("ensure_personal_workspace")');
    expect(actions).not.toContain('formData.get("workspaceId")');
    expect(actions).toContain('.eq("workspace_id", workspaceId)');
  });

  it("ships a working signed-in dashboard for tasks and maintenance", () => {
    expect(page).toContain('redirect("/auth/sign-in")');
    expect(page).toContain('from("home_tasks")');
    expect(page).toContain('from("home_maintenance_items")');
    expect(page).toContain("addHomeTaskAction");
    expect(page).toContain("completeHomeTaskAction");
    expect(page).toContain("addHomeMaintenanceAction");
  });

  it("connects the public Home & Family module card to the working foundation", () => {
    expect(modules).toContain('slug: "home"');
    expect(modules).toContain('launchHref: "/home"');
    expect(modules).toContain('nestedLabel: "Working foundation · Tasks + maintenance"');
    expect(modules).toContain('status: "development"');
  });
});
