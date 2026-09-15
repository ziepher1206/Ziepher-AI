export type ZiepherMatchLeadStatus =
  | "captured"
  | "validating"
  | "qualified"
  | "matching"
  | "available"
  | "customer_connected"
  | "inspection_scheduled"
  | "won"
  | "lost"
  | "duplicate"
  | "spam"
  | "invalid"
  | "expired"
  | "customer_cancelled"
  | "no_match";

export type ZLifeServiceStatus =
  | "requested"
  | "matched"
  | "inspection_scheduled"
  | "closed"
  | "canceled";

export type ZLifeMatchStatusProjection = {
  status: ZLifeServiceStatus;
  terminal: boolean;
  inspectionScheduledSignal: boolean;
  billableEventConfirmed: false;
};

export function projectZiepherMatchStatus(
  status: ZiepherMatchLeadStatus,
): ZLifeMatchStatusProjection {
  switch (status) {
    case "captured":
    case "validating":
    case "qualified":
    case "matching":
      return {
        status: "requested",
        terminal: false,
        inspectionScheduledSignal: false,
        billableEventConfirmed: false,
      };
    case "available":
    case "customer_connected":
      return {
        status: "matched",
        terminal: false,
        inspectionScheduledSignal: false,
        billableEventConfirmed: false,
      };
    case "inspection_scheduled":
      return {
        status: "inspection_scheduled",
        terminal: false,
        inspectionScheduledSignal: true,
        billableEventConfirmed: false,
      };
    case "customer_cancelled":
      return {
        status: "canceled",
        terminal: true,
        inspectionScheduledSignal: false,
        billableEventConfirmed: false,
      };
    case "won":
    case "lost":
    case "duplicate":
    case "spam":
    case "invalid":
    case "expired":
    case "no_match":
      return {
        status: "closed",
        terminal: true,
        inspectionScheduledSignal: false,
        billableEventConfirmed: false,
      };
  }
}
