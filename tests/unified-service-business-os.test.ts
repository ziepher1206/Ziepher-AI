import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("unified Z-Life service business OS", () => {
  const migration = source("supabase/migrations/20260915140500_unified_service_business_os.sql");

  it("creates one Business module instead of a top-level module per trade", () => {
    expect(migration).toContain("'business'");
    expect(migration).toContain("'Z-Life Business'");
    expect(migration).toContain("One adaptive service-business OS");
    expect(migration).toContain("where module_key = 'tree_service'");
    expect(migration).toContain("status = 'retired'");
  });

  it("stores the selected trade as an industry profile", () => {
    expect(migration).toContain("create table if not exists public.workspace_business_profiles");
    expect(migration).toContain("industry_key text not null references public.zlife_service_industries");
    expect(migration).toContain("'tree_service'");
    expect(migration).toContain("'pressure_washing'");
    expect(migration).toContain("'landscaping'");
    expect(migration).toContain("'hvac'");
    expect(migration).toContain("'plumbing'");
  });

  it("preserves existing Tree Service users by migrating them into Business", () => {
    expect(migration).toContain("insert into public.workspace_module_installations");
    expect(migration).toContain("'business'");
    expect(migration).toContain("'industry_profile':\"tree_service\"").toBe(false);
    expect(migration).toContain("{\"industry_profile\":\"tree_service\"}");
    expect(migration).toContain("insert into public.workspace_business_profiles");
  });
});
