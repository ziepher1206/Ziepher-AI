import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const foundation = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260913142500_ziepher_operate_foundation.sql"),
  "utf8"
);

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260913235500_tree_service_phase2_public_lead_intake.sql"),
  "utf8"
);

const publicRoute = readFileSync(
  path.join(process.cwd(), "app/api/public/operate/leads/[token]/route.ts"),
  "utf8"
);

const manualRoute = readFileSync(
  path.join(process.cwd(), "app/api/operate/leads/route.ts"),
  "utf8"
);

const leadsPage = readFileSync(
  path.join(process.cwd(), "app/operate/leads/page.tsx"),
  "utf8"
);

describe("Tree Service Phase 2 lead intake", () => {
  it("uses revocable, expiring, origin-restricted website intake tokens", () => {
    expect(migration).toContain("operate_lead_intake_tokens");
    expect(migration).toContain("revoked_at is null");
    expect(migration).toContain("expires_at is null or expires_at > now()");
    expect(migration).toContain("v_token.allowed_origin is not null");
    expect(migration).toContain("grant execute on function public.submit_public_operate_lead");
  });

  it("makes public form retries idempotent", () => {
    expect(foundation).toContain("unique (workspace_id, public_submission_id)");
    expect(migration).toContain("where workspace_id = v_token.workspace_id and public_submission_id = p_submission_id");
    expect(migration).toContain("when unique_violation then");
    expect(publicRoute).toContain("submissionId: z.string().uuid()");
  });

  it("rate limits each public intake token", () => {
    expect(migration).toContain("received_at > now() - interval '1 hour'");
    expect(migration).toContain(">= 120");
  });

  it("normalizes contact identity and serializes customer reuse", () => {
    expect(migration).toContain("regexp_replace(coalesce(v_lead.phone, ''), '[^0-9]', '', 'g')");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("lower(trim(coalesce(c.email, ''))) = v_email");
  });

  it("keeps source attribution on both manual and website intake", () => {
    expect(manualRoute).toContain("source_detail: input.sourceDetail || null");
    expect(publicRoute).toContain("p_source_detail: input.sourceDetail || null");
    expect(leadsPage).toContain("source_detail");
  });

  it("does not use the service-role key in the public intake route", () => {
    expect(publicRoute).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(publicRoute).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(publicRoute).not.toContain("createAdminClient");
  });
});
