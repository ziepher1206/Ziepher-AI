import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260915003000_zlife_services_foundation.sql", "utf8");
const actions = readFileSync("app/services/actions.ts", "utf8");
const page = readFileSync("app/services/page.tsx", "utf8");
const modules = readFileSync("lib/zlife/modules.ts", "utf8");

describe("ZLife Services foundation", () => {
  it("stores service requests behind workspace RLS", () => {
    expect(migration).toContain("create table if not exists public.service_requests");
    expect(migration).toContain("alter table public.service_requests enable row level security");
    expect(migration).toContain("public.is_workspace_member(workspace_id)");
    expect(migration).toContain("requested_by = auth.uid()");
    expect(migration).toContain("revoke all on public.service_requests from anon");
  });

  it("keeps provider and billable fields inert during direct ZLife request creation", () => {
    expect(actions).toContain("external_provider: null");
    expect(actions).toContain("external_request_id: null");
    expect(actions).toContain("billable_event_confirmed: false");
    expect(actions).toContain("inspection_scheduled_at: null");
    expect(actions).not.toContain("fetch(");
    expect(actions).not.toContain("getStripe(");
    expect(actions).not.toContain("OPENAI_API_KEY");
  });

  it("shows a safe readiness screen when the migration is not applied", () => {
    expect(page).toContain("missingServicesSchema");
    expect(page).toContain("20260915003000_zlife_services_foundation.sql");
    expect(page).toContain("cannot send a lead to Ziepher Match, schedule an inspection, or create a charge");
  });

  it("keeps ZLife request ownership separate from Ziepher Match marketplace execution", () => {
    expect(page).toContain("Ziepher Match remains a separate matching engine behind an explicit provider boundary");
    expect(page).toContain("No business is contacted by this action");
    expect(page).toContain("No billable event confirmed");
    expect(page).not.toContain("api.stripe.com");
    expect(page).not.toContain("twilio");
  });

  it("connects the public Services module to the working request foundation without claiming launch completion", () => {
    expect(modules).toContain('slug: "services"');
    expect(modules).toContain('launchHref: "/services"');
    expect(modules).toContain('nestedLabel: "Working foundation · Service requests"');
    expect(modules).toContain('status: "development"');
  });
});
