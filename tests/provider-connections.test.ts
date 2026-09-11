import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("provider connection persistence", () => {
  it("keeps secret columns encrypted-only and service-role scoped", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/0009_provider_connections.sql"),
      "utf8"
    );
    expect(sql).toContain("encrypted_access_token jsonb");
    expect(sql).toContain("encrypted_refresh_token jsonb");
    expect(sql).toContain("revoke all on table public.provider_connections from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table public.provider_connections to service_role");
  });

  it("clears encrypted tokens when a connection is revoked", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib/provider-connections/store.ts"),
      "utf8"
    );
    expect(source).toContain("encrypted_access_token: null");
    expect(source).toContain("encrypted_refresh_token: null");
    expect(source).toContain('status: "revoked"');
  });
});
