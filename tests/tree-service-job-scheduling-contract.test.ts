import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const scheduling = read("supabase/migrations/20260914000500_tree_service_phase3_scheduling_media.sql");

describe("Tree Service job scheduling contract", () => {
  it("requires authentication, workspace membership, and a schedulable job", () => {
    expect(scheduling).toContain("create or replace function public.schedule_operate_job");
    expect(scheduling).toContain("if auth.uid() is null then raise exception 'Authentication required.'");
    expect(scheduling).toContain("if not public.is_workspace_member(v_job.workspace_id) then raise exception 'Workspace access required.'");
    expect(scheduling).toContain("if v_job.status in ('completed','canceled') then raise exception 'This job cannot be scheduled.'");
  });

  it("includes service travel, preparation, and cleanup buffers in occupied time", () => {
    expect(scheduling).toContain("coalesce(s.travel_buffer_minutes,0)");
    expect(scheduling).toContain("coalesce(s.preparation_buffer_minutes,0)");
    expect(scheduling).toContain("coalesce(s.cleanup_buffer_minutes,0)");
    expect(scheduling).toContain("v_occupied_start := p_starts_at - make_interval(mins => v_travel + v_prep)");
    expect(scheduling).toContain("v_occupied_end := v_ends_at + make_interval(mins => v_cleanup)");
  });

  it("rejects inactive crews and non-member assigned users", () => {
    expect(scheduling).toContain("c.id = p_crew_id and c.workspace_id = v_job.workspace_id and c.active");
    expect(scheduling).toContain("Crew not found or inactive.");
    expect(scheduling).toContain("wm.workspace_id = v_job.workspace_id and wm.user_id = v_user_id");
    expect(scheduling).toContain("Assigned user is not a workspace member.");
  });

  it("enforces workspace, crew, and user schedule blocks", () => {
    expect(scheduling).toContain("so.mode = 'block'");
    expect(scheduling).toContain("so.resource_type = 'workspace'");
    expect(scheduling).toContain("so.resource_type = 'crew' and p_crew_id is not null and so.resource_crew_id = p_crew_id");
    expect(scheduling).toContain("so.resource_type = 'user' and so.resource_user_id = v_user_id");
    expect(scheduling).toContain("The selected time is blocked by a schedule exception.");
  });

  it("enforces configured crew working hours unless a matching open override exists", () => {
    expect(scheduling).toContain("v_special_open");
    expect(scheduling).toContain("public.availability_rules");
    expect(scheduling).toContain("falls outside this crew''s configured working hours");
    expect(scheduling).toContain("including travel/setup/cleanup extends past midnight");
  });

  it("updates the job and reuses its existing active appointment when possible", () => {
    expect(scheduling).toContain("set assigned_crew_id = p_crew_id");
    expect(scheduling).toContain("planned_start_at = p_starts_at");
    expect(scheduling).toContain("status = 'scheduled'");
    expect(scheduling).toContain("where a.workspace_id = v_job.workspace_id and a.job_id = v_job.id and a.status <> 'canceled'");
    expect(scheduling).toContain("if v_appointment_id is null then");
  });

  it("keeps direct scheduling RPC access away from public and anonymous roles", () => {
    expect(scheduling).toContain("revoke all on function public.schedule_operate_job(uuid,timestamptz,integer,uuid,uuid) from public, anon");
    expect(scheduling).toContain("grant execute on function public.schedule_operate_job(uuid,timestamptz,integer,uuid,uuid) to authenticated");
  });
});
