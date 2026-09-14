import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const foundation = readFileSync(path.join(process.cwd(), "supabase/migrations/20260914001500_tree_service_phase4_job_foundation.sql"), "utf8");
const execution = readFileSync(path.join(process.cwd(), "supabase/migrations/20260914001600_tree_service_phase4_execution.sql"), "utf8");
const fieldRoute = readFileSync(path.join(process.cwd(), "app/api/operate/jobs/[jobId]/field-readiness/route.ts"), "utf8");
const executionRoute = readFileSync(path.join(process.cwd(), "app/api/operate/jobs/[jobId]/execution/route.ts"), "utf8");
const jobPage = readFileSync(path.join(process.cwd(), "app/operate/jobs/[jobId]/page.tsx"), "utf8");
const changeOrders = readFileSync(path.join(process.cwd(), "app/api/operate/jobs/[jobId]/change-orders/route.ts"), "utf8");

describe("Tree Service Phase 4 jobs and crew", () => {
  it("adds real field-service job states", () => {
    expect(foundation).toContain("'en_route'");
    expect(foundation).toContain("'arrived'");
    expect(foundation).toContain("'weather_delay'");
    expect(execution).toContain("v_action = 'depart'");
    expect(execution).toContain("v_action = 'arrive'");
    expect(execution).toContain("v_action = 'weather'");
    expect(executionRoute).toContain('"depart", "arrive", "start", "weather", "pause", "resume"');
  });

  it("stores structured tree-service equipment and hazard readiness", () => {
    expect(foundation).toContain("required_equipment text[]");
    expect(foundation).toContain("power_line_hazard boolean");
    expect(foundation).toContain("traffic_control_required boolean");
    expect(foundation).toContain("structure_risk boolean");
    expect(fieldRoute).toContain("requiredEquipment");
    expect(fieldRoute).toContain("powerLineHazard");
    expect(jobPage).toContain("requiredEquipment={job.required_equipment");
  });

  it("keeps change orders workspace scoped with explicit approval evidence", () => {
    expect(foundation).toContain("operate_job_change_orders");
    expect(foundation).toContain("operate_job_change_orders_job_workspace_fk");
    expect(foundation).toContain("approval_method");
    expect(foundation).toContain("approved_at");
    expect(changeOrders).toContain("customer_in_person");
    expect(changeOrders).toContain("Customer has already approved");
  });

  it("requires completion verification and an after photo", () => {
    expect(foundation).toContain("completion_work_verified boolean");
    expect(foundation).toContain("completion_cleanup_verified boolean");
    expect(execution).toContain("Verify completed work and cleanup before completing the job.");
    expect(execution).toContain("m.category = 'after'");
    expect(execution).toContain("Add at least one after photo before completing the job.");
  });

  it("carries approved change orders into invoice lineage", () => {
    expect(execution).toContain("v_change_total");
    expect(execution).toContain("co.status = 'approved'");
    expect(execution).toContain("'Change order — ' || co.description");
    expect(execution).toContain("'changeOrderId',co.id");
  });

  it("gives crews a direct navigation action on the job screen", () => {
    expect(jobPage).toContain("google.com/maps/search");
    expect(jobPage).toContain(">Navigate</a>");
  });
});
