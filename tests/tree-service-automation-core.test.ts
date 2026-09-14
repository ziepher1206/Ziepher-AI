import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TREE_AUTOMATION_POLICY,
  planTreeServiceAutomation
} from "../lib/operate/automation";

const migration = readFileSync(
  "supabase/migrations/20260914210500_tree_service_automation_core.sql",
  "utf8"
);

describe("Tree Service automation core", () => {
  it("automates safe internal progression by default", () => {
    expect(planTreeServiceAutomation({ kind: "lead_received", entityId: "lead-1" })[0]).toMatchObject({
      type: "qualify_lead",
      risk: "internal",
      mode: "automatic"
    });
    expect(planTreeServiceAutomation({ kind: "estimate_accepted", entityId: "est-1" })[0]).toMatchObject({
      type: "create_job_from_estimate",
      risk: "internal",
      mode: "automatic"
    });
    expect(planTreeServiceAutomation({ kind: "job_completed", entityId: "job-1" })[0]).toMatchObject({
      type: "prepare_invoice",
      risk: "internal",
      mode: "automatic"
    });
  });

  it("keeps scheduling, crew assignment and external side effects blocked by default", () => {
    expect(DEFAULT_TREE_AUTOMATION_POLICY.autoScheduleAppointments).toBe(false);
    expect(DEFAULT_TREE_AUTOMATION_POLICY.autoAssignCrews).toBe(false);
    expect(DEFAULT_TREE_AUTOMATION_POLICY.autoSendCustomerMessages).toBe(false);
    expect(DEFAULT_TREE_AUTOMATION_POLICY.autoPublishMarketing).toBe(false);
    expect(DEFAULT_TREE_AUTOMATION_POLICY.autoChargePayments).toBe(false);

    expect(planTreeServiceAutomation({ kind: "invoice_ready", entityId: "inv-1" })[0]).toMatchObject({
      type: "charge_payment",
      risk: "external",
      mode: "blocked"
    });
    expect(planTreeServiceAutomation({ kind: "job_ready_for_assignment", entityId: "job-2" })[0]).toMatchObject({
      type: "assign_crew",
      risk: "approval",
      mode: "blocked"
    });
  });

  it("uses idempotent event keys", () => {
    const first = planTreeServiceAutomation({ kind: "estimate_accepted", entityId: "est-1" })[0];
    const second = planTreeServiceAutomation({ kind: "estimate_accepted", entityId: "est-1" })[0];
    expect(first.key).toBe("create_job_from_estimate:est-1");
    expect(second.key).toBe(first.key);
    expect(migration).toContain("unique (workspace_id, event_key)");
  });

  it("keeps automation configuration and queue writes server-controlled", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("is_workspace_member(workspace_id)");
    expect(migration).toContain("revoke insert, update, delete on public.operate_automation_policies from anon, authenticated");
    expect(migration).toContain("revoke insert, update, delete on public.operate_automation_events from anon, authenticated");
  });
});
