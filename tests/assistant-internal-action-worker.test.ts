import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  assistantWorkerBoundaryMessage,
  growthPreparationSummary,
  isSupportedAssistantInternalEvent,
} from "../lib/operate/assistant-internal-worker";

const route = readFileSync(
  "app/api/operate/assistant/actions/process/route.ts",
  "utf8",
);
const component = readFileSync(
  "components/operate-assistant-safe-actions.tsx",
  "utf8",
);

describe("ZLife Assistant internal action worker", () => {
  it("supports only the first deterministic internal execution types", () => {
    expect(isSupportedAssistantInternalEvent("qualify_lead")).toBe(true);
    expect(isSupportedAssistantInternalEvent("prepare_review_followup")).toBe(true);
    expect(isSupportedAssistantInternalEvent("prepare_growth_action")).toBe(true);
    expect(isSupportedAssistantInternalEvent("assign_crew")).toBe(false);
    expect(isSupportedAssistantInternalEvent("send_customer_message")).toBe(false);
    expect(isSupportedAssistantInternalEvent("publish_marketing")).toBe(false);
    expect(isSupportedAssistantInternalEvent("charge_payment")).toBe(false);
  });

  it("produces a deterministic no-publish growth preparation", () => {
    const summary = growthPreparationSummary({
      name: "Spring cleanup",
      endsAt: "2026-10-01T12:00:00.000Z",
    });
    expect(summary).toContain("verify the offer");
    expect(summary).toContain("No publishing or paid spend was started");
    expect(assistantWorkerBoundaryMessage("charge_payment")).toContain(
      "approval-gated and external actions remain blocked",
    );
  });

  it("authenticates, scopes the event to the workspace, and claims it before execution", () => {
    expect(route).toContain("supabase.auth.getUser()");
    expect(route).toContain('"ensure_personal_workspace"');
    expect(route).toContain('from("operate_automation_events")');
    expect(route).toContain('.eq("workspace_id", workspaceId)');
    expect(route).toContain('status: "processing"');
    expect(route).toContain('.eq("status", event.status)');
  });

  it("executes only internal database preparation and records explicit no-external evidence", () => {
    expect(route).toContain('status: "qualified"');
    expect(route).toContain('status: "ready"');
    expect(route).toContain("assistant_preparation");
    expect(route).toContain("externalActionTaken: false");
    expect(route).toContain("published: false");
    expect(route).toContain("paid_spend_started: false");
    expect(route).not.toContain("send_customer_message");
    expect(route).not.toContain("charge_payment");
    expect(route).not.toContain("publish_marketing");
  });

  it("surfaces manual processing controls and warns that unsupported types are blocked", () => {
    expect(component).toContain("Internal-only worker");
    expect(component).toContain("Process internal event");
    expect(component).toContain("Unsupported types are blocked instead of guessed");
    expect(component).toContain("No customer communication, publishing, charge, scheduling, or provider purchase was executed");
  });
});
