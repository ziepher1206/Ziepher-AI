import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const schedulingFoundation = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260913143500_ziepher_operate_scheduling.sql"),
  "utf8"
);
const phase3 = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260914000500_tree_service_phase3_scheduling_media.sql"),
  "utf8"
);
const publicLock = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260914000700_tree_service_phase3_lock_public_estimate_rpc.sql"),
  "utf8"
);
const publicEstimate = readFileSync(
  path.join(process.cwd(), "lib/operate/public-estimate.ts"),
  "utf8"
);
const publicPage = readFileSync(
  path.join(process.cwd(), "app/estimate/[token]/page.tsx"),
  "utf8"
);
const setupRoute = readFileSync(
  path.join(process.cwd(), "app/api/operate/setup/service-timing/route.ts"),
  "utf8"
);

describe("Tree Service Phase 3 estimates and scheduling", () => {
  it("prevents active user and crew appointment overlaps at the database layer", () => {
    expect(schedulingFoundation).toContain("appointments_no_active_user_overlap");
    expect(schedulingFoundation).toContain("appointments_no_active_crew_overlap");
    expect(schedulingFoundation).toContain("occupied_during with &&");
  });

  it("includes travel, preparation, and cleanup in occupied calendar time", () => {
    expect(phase3).toContain("travel_buffer_minutes");
    expect(phase3).toContain("new.travel_buffer_minutes + new.preparation_buffer_minutes");
    expect(phase3).toContain("new.ends_at + new.cleanup_buffer_minutes");
    expect(phase3).toContain("v_occupied_start");
    expect(phase3).toContain("v_occupied_end");
  });

  it("enforces blocked time and crew working hours against the full occupied range", () => {
    expect(phase3).toContain("tstzrange(v_occupied_start, v_occupied_end, '[)')");
    expect(phase3).toContain("falls outside this crew''s configured working hours");
  });

  it("guarantees one job lineage per accepted estimate", () => {
    expect(phase3).toContain("jobs_workspace_estimate_unique_idx");
    expect(phase3).toContain("on public.jobs(workspace_id, estimate_id)");
    expect(phase3).toContain("where estimate_id is not null");
  });

  it("supports workspace-scoped estimate photos", () => {
    expect(phase3).toContain("operate_estimate_media");
    expect(phase3).toContain("Workspace members can add estimate media");
    expect(phase3).toContain("operate_estimate_media_estimate_workspace_fk");
    expect(publicPage).toContain("estimate.photos.map");
  });

  it("keeps public estimate capability RPCs behind the Ziepher server", () => {
    expect(publicEstimate).toContain("createAdminClient");
    expect(publicLock).toContain("get_public_operate_estimate(uuid) from public, anon, authenticated");
    expect(publicLock).toContain("accept_public_operate_estimate(uuid) from public, anon, authenticated");
    expect(publicLock).toContain("to service_role");
    expect(publicPage).toContain("getPublicEstimate(token)");
    expect(publicPage).not.toContain("publicSupabaseRpc");
  });

  it("requires workspace admin access to change service timing", () => {
    expect(setupRoute).toContain("requireWorkspaceAdmin(input.workspaceId)");
    expect(setupRoute).toContain("service.scheduling_buffers_updated");
  });
});
