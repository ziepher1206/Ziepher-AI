import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("Tree Service Phase 1 foundation", () => {
  it("keeps admin audit events append-only and workspace scoped", () => {
    const sql = read("supabase/migrations/20260913234500_operate_admin_audit_log.sql");
    expect(sql).toContain("alter table public.operate_audit_events enable row level security");
    expect(sql).toContain("public.is_workspace_member(workspace_id)");
    expect(sql).toContain("actor_user_id = (select auth.uid())");
    expect(sql).toContain("grant select, insert on table public.operate_audit_events to authenticated");
    expect(sql).not.toMatch(/for\s+(update|delete)\s+to\s+authenticated/i);
  });

  it("requires explicit workspace admin authorization for every setup mutation route", () => {
    const routes = [
      "app/api/operate/setup/route.ts",
      "app/api/operate/setup/business-profile/route.ts",
      "app/api/operate/setup/crew-staffing/route.ts",
      "app/api/operate/setup/schedule-overrides/route.ts"
    ];

    for (const route of routes) {
      const source = read(route);
      expect(source).toContain("requireWorkspaceAdmin");
      expect(source).toContain("recordOperateAuditEvent");
    }
  });

  it("keeps provider credentials server scoped and encrypted", () => {
    const sql = read("supabase/migrations/0009_provider_connections.sql");
    const security = read("docs/SECURITY.md");
    expect(sql).toContain("revoke all on table public.provider_connections from public, anon, authenticated");
    expect(sql).toContain("encrypted_access_token jsonb");
    expect(sql).toContain("encrypted_refresh_token jsonb");
    expect(security).toContain("ZIEPHER_PROVIDER_CREDENTIALS_KEY");
    expect(security).toContain("never returned by connection-status APIs");
  });

  it("keeps the build/release workflow separated into preview and production rails", () => {
    const releaseSql = read("supabase/migrations/0019_source_control_production_release.sql");
    const env = read(".env.example");
    expect(releaseSql.toLowerCase()).toContain("production");
    expect(env).toContain("production-release rails remain disabled");
  });

  it("keeps Stripe locked to explicit test mode for the first launch", () => {
    const config = read("lib/stripe/operate-payment-config.ts");
    expect(config).toContain('ZIEPHER_OPERATE_STRIPE_TEST_ENABLED === "true"');
    expect(config).toContain('secretKey.startsWith("sk_test_")');
    expect(config).toContain("currently accepts Stripe test keys only");
  });
});
