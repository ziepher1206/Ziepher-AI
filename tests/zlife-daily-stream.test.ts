import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life unified daily stream", () => {
  const migration = source("supabase/migrations/20260915172500_zlife_daily_items.sql");
  const today = source("app/today/page.tsx");

  it("creates one normalized cross-module attention stream", () => {
    expect(migration).toContain("create table if not exists public.zlife_daily_items");
    expect(migration).toContain("source_module text not null");
    expect(migration).toContain("source_entity_type text");
    expect(migration).toContain("source_entity_id text");
    expect(migration).toContain("action_href text");
    expect(migration).toContain("metadata jsonb");
  });

  it("covers the daily-life categories needed by My Day", () => {
    for (const kind of [
      "task",
      "appointment",
      "reminder",
      "payment_due",
      "subscription_due",
      "school",
      "shopping",
      "errand",
      "health",
      "business",
      "vehicle",
      "document",
      "family"
    ]) {
      expect(migration).toContain(`'${kind}'`);
    }
  });

  it("keeps workspace access isolated with RLS", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("public.is_workspace_member(workspace_id)");
    expect(migration).toContain('policy "Workspace members can read daily items"');
  });

  it("renders daily items only when the stream exists", () => {
    expect(today).toContain('.from("zlife_daily_items")');
    expect(today).toContain("dailyStreamReady && unifiedItems.length");
    expect(today).toContain("Coming up across connected modules");
    expect(today).toContain("Modules keep their own full records");
  });
});
