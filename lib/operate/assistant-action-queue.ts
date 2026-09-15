import { z } from "zod";

import {
  DEFAULT_TREE_AUTOMATION_POLICY,
  planTreeServiceAutomation,
  type AutomationSignal,
} from "./automation";

export const assistantActionSignalSchema = z.object({
  kind: z.enum([
    "lead_received",
    "estimate_ready",
    "estimate_accepted",
    "job_ready_for_assignment",
    "job_completed",
    "invoice_ready",
    "review_ready",
    "growth_ready",
  ]),
  entityId: z.string().uuid(),
});

export type AssistantActionSignal = z.infer<typeof assistantActionSignalSchema>;

const ENTITY_TABLES: Record<AssistantActionSignal["kind"], { table: string; entityType: string }> = {
  lead_received: { table: "leads", entityType: "lead" },
  estimate_ready: { table: "estimates", entityType: "estimate" },
  estimate_accepted: { table: "estimates", entityType: "estimate" },
  job_ready_for_assignment: { table: "jobs", entityType: "job" },
  job_completed: { table: "jobs", entityType: "job" },
  invoice_ready: { table: "invoices", entityType: "invoice" },
  review_ready: { table: "operate_review_requests", entityType: "review_request" },
  growth_ready: { table: "marketing_campaigns", entityType: "campaign" },
};

export function assistantEntityTarget(kind: AssistantActionSignal["kind"]) {
  return ENTITY_TABLES[kind];
}

export function safeAssistantActions(signal: AssistantActionSignal) {
  const planned = planTreeServiceAutomation(signal as AutomationSignal, DEFAULT_TREE_AUTOMATION_POLICY);
  return planned.filter((item) => item.risk === "internal" && item.mode === "automatic");
}

export function assistantAutomationEventKey(actionType: string, entityId: string) {
  return `assistant:${actionType}:${entityId}`;
}
