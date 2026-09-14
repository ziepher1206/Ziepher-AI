import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  assistantAutomationEventKey,
  assistantEntityTarget,
  safeAssistantActions,
} from "../lib/operate/assistant-action-queue";

const route = readFileSync(
  "app/api/operate/assistant/actions/route.ts",
  "utf8",
);
const page = readFileSync("app/operate/assistant/page.tsx", "utf8");
const component = readFileSync(
  "components/operate-assistant-safe-actions.tsx",
  "utf8",
);

describe("ZLife Assistant safe-action orchestration", () => {
  it("returns only automatic internal actions from the default policy", () => {
    const leadActions = safeAssistantActions({
      kind: "lead_received",
      entityId: "00000000-0000-4000-8000-000000000001",
    });

    expect(leadActions.map((item) => item.type)).toEqual(["qualify_lead"]);
    expect(leadActions.every((item) => item.risk === "internal")).toBe(true);
    expect(leadActions.every((item) => item.mode === "automatic")).toBe(true);

    expect(
      safeAssistantActions({
        kind: "invoice_ready",
        entityId: "00000000-0000-4000-8000-000000000002",
      }),
    ).toEqual([]);
    expect(
      safeAssistantActions({
        kind: "job_ready_for_assignment",
        entityId: "00000000-0000-4000-8000-000000000003",
      }),
    ).toEqual([]);
  });

  it("maps action targets to workspace-owned records and deterministic event keys", () => {
    expect(assistantEntityTarget("lead_received")).toEqual({
      table: "leads",
      entityType: "lead",
    });
    expect(assistantEntityTarget("review_ready")).toEqual({
      table: "operate_review_requests",
      entityType: "review_request",
    });
    expect(assistantAutomationEventKey("qualify_lead", "abc")).toBe(
      "assistant:qualify_lead:abc",
    );
  });

  it("authenticates, workspace-scopes, and queues through the server-only automation table", () => {
    expect(route).toContain("supabase.auth.getUser()");
    expect(route).toContain('supabase.rpc(\n    "ensure_personal_workspace"');
    expect(route).toContain('.eq("workspace_id", workspaceId)');
    expect(route).toContain('from("operate_automation_events")');
    expect(route).toContain('risk_level: "internal"');
    expect(route).toContain('blockedClasses: ["approval", "external"]');
    expect(route).not.toContain("autoSendCustomerMessages: true");
    expect(route).not.toContain("autoChargePayments: true");
    expect(route).not.toContain("autoPublishMarketing: true");
  });

  it("surfaces the internal-only queue and recent audit evidence in the Assistant UI", () => {
    expect(page).toContain("OperateAssistantSafeActions");
    expect(page).toContain('from("operate_automation_events")');
    expect(page).toContain("safeActionSuggestions");
    expect(component).toContain("Internal-only queue");
    expect(component).toContain("Queue internal prep");
    expect(component).toContain("No message, charge, publish, or external action was executed");
  });
});
