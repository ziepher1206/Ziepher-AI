export type AutomationRisk = "internal" | "approval" | "external";

export type TreeAutomationPolicy = {
  autoQualifyLeads: boolean;
  autoPrepareEstimates: boolean;
  autoCreateJobsFromAcceptedEstimates: boolean;
  autoPrepareInvoices: boolean;
  autoPrepareReviewFollowups: boolean;
  autoPrepareGrowthActions: boolean;
  autoScheduleAppointments: boolean;
  autoAssignCrews: boolean;
  autoSendCustomerMessages: boolean;
  autoPublishMarketing: boolean;
  autoChargePayments: boolean;
};

export type AutomationSignal = {
  kind:
    | "lead_received"
    | "estimate_ready"
    | "estimate_accepted"
    | "job_ready_for_assignment"
    | "job_completed"
    | "invoice_ready"
    | "review_ready"
    | "growth_ready";
  entityId: string;
};

export type AutomationAction = {
  key: string;
  type: string;
  entityId: string;
  risk: AutomationRisk;
  mode: "automatic" | "blocked";
  reason: string;
};

export const DEFAULT_TREE_AUTOMATION_POLICY: TreeAutomationPolicy = {
  autoQualifyLeads: true,
  autoPrepareEstimates: true,
  autoCreateJobsFromAcceptedEstimates: true,
  autoPrepareInvoices: true,
  autoPrepareReviewFollowups: true,
  autoPrepareGrowthActions: true,
  autoScheduleAppointments: false,
  autoAssignCrews: false,
  autoSendCustomerMessages: false,
  autoPublishMarketing: false,
  autoChargePayments: false
};

function action(input: Omit<AutomationAction, "key">): AutomationAction {
  return {
    ...input,
    key: `${input.type}:${input.entityId}`
  };
}

export function planTreeServiceAutomation(
  signal: AutomationSignal,
  policy: TreeAutomationPolicy = DEFAULT_TREE_AUTOMATION_POLICY
): AutomationAction[] {
  switch (signal.kind) {
    case "lead_received":
      return [
        action({
          type: "qualify_lead",
          entityId: signal.entityId,
          risk: "internal",
          mode: policy.autoQualifyLeads ? "automatic" : "blocked",
          reason: policy.autoQualifyLeads
            ? "Internal lead qualification is enabled."
            : "Lead qualification automation is disabled by policy."
        }),
        action({
          type: "schedule_estimate_appointment",
          entityId: signal.entityId,
          risk: "approval",
          mode: policy.autoScheduleAppointments ? "automatic" : "blocked",
          reason: policy.autoScheduleAppointments
            ? "Appointment auto-scheduling is explicitly enabled."
            : "Scheduling remains approval-gated until explicitly enabled."
        })
      ];

    case "estimate_ready":
      return [
        action({
          type: "prepare_estimate",
          entityId: signal.entityId,
          risk: "internal",
          mode: policy.autoPrepareEstimates ? "automatic" : "blocked",
          reason: policy.autoPrepareEstimates
            ? "Estimate drafting from configured business rules is enabled."
            : "Estimate drafting automation is disabled by policy."
        })
      ];

    case "estimate_accepted":
      return [
        action({
          type: "create_job_from_estimate",
          entityId: signal.entityId,
          risk: "internal",
          mode: policy.autoCreateJobsFromAcceptedEstimates ? "automatic" : "blocked",
          reason: policy.autoCreateJobsFromAcceptedEstimates
            ? "Accepted estimates may progress into internal job records automatically."
            : "Automatic job creation is disabled by policy."
        })
      ];

    case "job_ready_for_assignment":
      return [
        action({
          type: "assign_crew",
          entityId: signal.entityId,
          risk: "approval",
          mode: policy.autoAssignCrews ? "automatic" : "blocked",
          reason: policy.autoAssignCrews
            ? "Crew auto-assignment is explicitly enabled."
            : "Crew assignment remains approval-gated until explicitly enabled."
        })
      ];

    case "job_completed":
      return [
        action({
          type: "prepare_invoice",
          entityId: signal.entityId,
          risk: "internal",
          mode: policy.autoPrepareInvoices ? "automatic" : "blocked",
          reason: policy.autoPrepareInvoices
            ? "Completed jobs may produce draft invoices automatically."
            : "Invoice preparation automation is disabled by policy."
        })
      ];

    case "invoice_ready":
      return [
        action({
          type: "charge_payment",
          entityId: signal.entityId,
          risk: "external",
          mode: policy.autoChargePayments ? "automatic" : "blocked",
          reason: policy.autoChargePayments
            ? "Payment charging has been separately enabled by policy."
            : "Payment charging remains blocked by default."
        })
      ];

    case "review_ready":
      return [
        action({
          type: "prepare_review_followup",
          entityId: signal.entityId,
          risk: "internal",
          mode: policy.autoPrepareReviewFollowups ? "automatic" : "blocked",
          reason: policy.autoPrepareReviewFollowups
            ? "Review follow-up drafting is enabled."
            : "Review follow-up drafting is disabled by policy."
        }),
        action({
          type: "send_customer_message",
          entityId: signal.entityId,
          risk: "external",
          mode: policy.autoSendCustomerMessages ? "automatic" : "blocked",
          reason: policy.autoSendCustomerMessages
            ? "Customer messaging has been separately enabled by policy."
            : "Customer messaging remains blocked by default."
        })
      ];

    case "growth_ready":
      return [
        action({
          type: "prepare_growth_action",
          entityId: signal.entityId,
          risk: "internal",
          mode: policy.autoPrepareGrowthActions ? "automatic" : "blocked",
          reason: policy.autoPrepareGrowthActions
            ? "Growth recommendations may be prepared automatically."
            : "Growth automation is disabled by policy."
        }),
        action({
          type: "publish_marketing",
          entityId: signal.entityId,
          risk: "external",
          mode: policy.autoPublishMarketing ? "automatic" : "blocked",
          reason: policy.autoPublishMarketing
            ? "Marketing publishing has been separately enabled by policy."
            : "Marketing publishing remains blocked by default."
        })
      ];
  }
}
