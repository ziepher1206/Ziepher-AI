import { describe, expect, it } from "vitest";

import { projectZiepherMatchStatus } from "../lib/services/ziepher-match-status";

describe("ZLife Services Ziepher Match status projection", () => {
  it("keeps early marketplace lifecycle states as requested", () => {
    for (const status of ["captured", "validating", "qualified", "matching"] as const) {
      expect(projectZiepherMatchStatus(status)).toEqual({
        status: "requested",
        terminal: false,
        inspectionScheduledSignal: false,
        billableEventConfirmed: false,
      });
    }
  });

  it("projects available and connected leads as matched", () => {
    expect(projectZiepherMatchStatus("available").status).toBe("matched");
    expect(projectZiepherMatchStatus("customer_connected").status).toBe("matched");
  });

  it("treats inspection scheduling as a workflow signal without confirming billing", () => {
    expect(projectZiepherMatchStatus("inspection_scheduled")).toEqual({
      status: "inspection_scheduled",
      terminal: false,
      inspectionScheduledSignal: true,
      billableEventConfirmed: false,
    });
  });

  it("maps customer cancellation separately from other terminal outcomes", () => {
    expect(projectZiepherMatchStatus("customer_cancelled")).toMatchObject({
      status: "canceled",
      terminal: true,
      billableEventConfirmed: false,
    });

    for (const status of ["won", "lost", "duplicate", "spam", "invalid", "expired", "no_match"] as const) {
      expect(projectZiepherMatchStatus(status)).toMatchObject({
        status: "closed",
        terminal: true,
        billableEventConfirmed: false,
      });
    }
  });
});
