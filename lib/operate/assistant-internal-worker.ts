export const SUPPORTED_ASSISTANT_INTERNAL_EVENTS = [
  "qualify_lead",
  "prepare_review_followup",
  "prepare_growth_action",
] as const;

export type SupportedAssistantInternalEvent =
  (typeof SUPPORTED_ASSISTANT_INTERNAL_EVENTS)[number];

export function isSupportedAssistantInternalEvent(
  value: string,
): value is SupportedAssistantInternalEvent {
  return (SUPPORTED_ASSISTANT_INTERNAL_EVENTS as readonly string[]).includes(value);
}

export function assistantWorkerBoundaryMessage(eventType: string) {
  return `Assistant worker will not execute ${eventType}. Only deterministic internal preparation types are supported; approval-gated and external actions remain blocked.`;
}

export function growthPreparationSummary(input: {
  name: string;
  endsAt: string | null;
}) {
  const timing = input.endsAt
    ? `Review timing before ${new Date(input.endsAt).toISOString()}.`
    : "Add campaign timing before any publishing decision.";
  return `${input.name}: verify the offer, landing-page destination, approved media, audience, and tracking plan. ${timing} No publishing or paid spend was started.`;
}
