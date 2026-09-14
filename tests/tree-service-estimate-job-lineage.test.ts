import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const approval = read("supabase/migrations/20260913155000_operate_public_estimate_approval.sql");
const publicLock = read("supabase/migrations/20260914000700_tree_service_phase3_lock_public_estimate_rpc.sql");

describe("Tree Service estimate to job lineage", () => {
  it("reuses an existing job for the estimate instead of creating duplicates", () => {
    expect(approval).toContain("where j.workspace_id = v_estimate.workspace_id and j.estimate_id = v_estimate.id");
    expect(approval).toContain("if v_job_id is null then");
    expect(approval).toContain("return v_job_id;");
  });

  it("preserves customer, property, lead, service, estimate, workspace and value lineage", () => {
    expect(approval).toContain("workspace_id,customer_id,property_id,lead_id,estimate_id,service_id");
    expect(approval).toContain("v_estimate.workspace_id,v_estimate.customer_id,v_estimate.property_id,v_estimate.lead_id,v_estimate.id,v_estimate.service_id");
    expect(approval).toContain("v_estimate.total_cents");
  });

  it("marks the estimate accepted and the originating lead won without crossing workspaces", () => {
    expect(approval).toContain("set status='accepted', accepted_at=coalesce(accepted_at,now())");
    expect(approval).toContain("where id=v_estimate.id and workspace_id=v_estimate.workspace_id");
    expect(approval).toContain("update public.leads set status='won'");
    expect(approval).toContain("where id=v_estimate.lead_id and workspace_id=v_estimate.workspace_id");
  });

  it("keeps public estimate reads and acceptance behind the ZLife server boundary", () => {
    expect(publicLock).toContain("get_public_operate_estimate(uuid) from public, anon, authenticated");
    expect(publicLock).toContain("accept_public_operate_estimate(uuid) from public, anon, authenticated");
    expect(publicLock).toContain("grant execute on function public.get_public_operate_estimate(uuid) to service_role");
    expect(publicLock).toContain("grant execute on function public.accept_public_operate_estimate(uuid) to service_role");
  });
});
