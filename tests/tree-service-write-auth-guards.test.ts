import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Tree Service write-route auth boundaries", () => {
  it("requires an authenticated user before converting leads into estimate appointments", () => {
    const route = source("app/api/operate/leads/[leadId]/schedule-estimate/route.ts");

    expect(route).toContain("supabase.auth.getUser()");
    expect(route).toContain('if (!user) throw new Error("Authentication required.")');
    expect(route).toContain('supabase.rpc("convert_operate_lead_to_estimate"');
  });

  it("requires an authenticated user before mutating job execution or completing a job", () => {
    const route = source("app/api/operate/jobs/[jobId]/execution/route.ts");

    expect(route).toContain("supabase.auth.getUser()");
    expect(route).toContain('if (!user) throw new Error("Authentication required.")');
    expect(route).toContain('supabase.rpc("set_operate_job_execution_state"');
    expect(route).toContain('supabase.rpc("complete_operate_job"');
  });
});
