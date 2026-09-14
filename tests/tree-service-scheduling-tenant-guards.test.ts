import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function migration() {
  return readFileSync(
    join(process.cwd(), "supabase/migrations/20260913143500_ziepher_operate_scheduling.sql"),
    "utf8",
  );
}

describe("Tree Service scheduling tenant guards", () => {
  it("keeps appointment relationships scoped to the same workspace", () => {
    const sql = migration();

    for (const constraint of [
      "appointments_customer_workspace_fk",
      "appointments_property_workspace_fk",
      "appointments_lead_workspace_fk",
      "appointments_service_workspace_fk",
      "appointments_job_workspace_fk",
      "appointments_estimate_workspace_fk",
      "appointments_user_workspace_fk",
      "appointments_crew_workspace_fk",
    ]) {
      expect(sql).toContain(`constraint ${constraint}`);
    }

    expect(sql).toContain("foreign key (customer_id, workspace_id)");
    expect(sql).toContain("foreign key (property_id, workspace_id)");
    expect(sql).toContain("foreign key (lead_id, workspace_id)");
    expect(sql).toContain("foreign key (service_id, workspace_id)");
    expect(sql).toContain("foreign key (job_id, workspace_id)");
    expect(sql).toContain("foreign key (estimate_id, workspace_id)");
    expect(sql).toContain("foreign key (workspace_id, assigned_user_id)");
    expect(sql).toContain("foreign key (assigned_crew_id, workspace_id)");
  });

  it("keeps estimate and job relationships workspace-scoped", () => {
    const sql = migration();

    for (const constraint of [
      "estimates_customer_workspace_fk",
      "estimates_property_workspace_fk",
      "estimates_lead_workspace_fk",
      "estimates_service_workspace_fk",
      "estimates_estimator_workspace_fk",
      "jobs_customer_workspace_fk",
      "jobs_property_workspace_fk",
      "jobs_lead_workspace_fk",
      "jobs_estimate_workspace_fk",
      "jobs_service_workspace_fk",
      "jobs_crew_workspace_fk",
      "jobs_owner_workspace_fk",
    ]) {
      expect(sql).toContain(`constraint ${constraint}`);
    }
  });

  it("keeps active user and crew appointment overlap protection", () => {
    const sql = migration();

    expect(sql).toContain("constraint appointments_no_active_user_overlap");
    expect(sql).toContain("constraint appointments_no_active_crew_overlap");
    expect(sql).toContain("occupied_during with &&");
    expect(sql).toContain("status in ('tentative', 'confirmed', 'in_progress')");
  });

  it("keeps appointment writes behind workspace membership RLS", () => {
    const sql = migration();

    expect(sql).toContain('create policy "Workspace members can operate appointments"');
    expect(sql).toContain("using (public.is_workspace_member(workspace_id))");
    expect(sql).toContain("with check (public.is_workspace_member(workspace_id));");
    expect(sql).toContain("revoke all on public.estimates, public.estimate_line_items, public.jobs,");
    expect(sql).toContain("public.appointments, public.availability_rules, public.schedule_overrides from anon;");
  });
});
