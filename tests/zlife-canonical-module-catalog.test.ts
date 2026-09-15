import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("canonical signed-in Z-Life module catalog", () => {
  const migration = source("supabase/migrations/20260915143500_canonical_zlife_module_catalog.sql");

  it("keeps working slices available and unfinished modules in preview", () => {
    expect(migration).toContain("'business'");
    expect(migration).toContain("'Z-Life Business'");
    expect(migration).toContain("'home_family'");
    expect(migration).toContain("'Home & Family'");
    expect(migration).toContain("'available'");
    for (const key of ["web_builder", "app_builder", "money", "auto", "documents", "health", "travel", "learning", "services"]) {
      expect(migration).toContain(`'${key}'`);
    }
    expect(migration).toContain("'preview'");
  });

  it("does not make the central Assistant an optional plug-in", () => {
    expect(migration).toContain("central Assistant are not optional");
    expect(migration).not.toContain("'assistant',");
  });

  it("uses real routes for working slices and information routes for previews", () => {
    expect(migration).toContain("'/operate'");
    expect(migration).toContain("'/home'");
    expect(migration).toContain("'/projects'");
    expect(migration).toContain("'/modules/money'");
    expect(migration).toContain("'/modules/health'");
  });
});
