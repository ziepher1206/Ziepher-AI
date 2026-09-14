import { describe, expect, it } from "vitest";
import { estimateTreeJobDuration } from "@/lib/operate/tree-duration-estimator";

const base = {
  serviceText: "Tree removal",
  treeCount: 1,
  treeSize: "large" as const,
  access: "normal" as const,
  slope: "normal" as const,
  dragDistance: "difficult" as const,
  cleanup: "heavy" as const,
  crewSize: 3,
  crewPace: "standard" as const,
  experienceLevel: "experienced" as const,
  requiresClimbing: true,
  requiresRigging: true,
  equipment: []
};

describe("tree job duration estimator", () => {
  it("shows machinery can reduce estimated duration", () => {
    const without = estimateTreeJobDuration(base);
    const withEquipment = estimateTreeJobDuration({ ...base, equipment: ["chipper", "mini_skid", "bucket_truck", "crane"] });
    expect(withEquipment.current.minutesHigh).toBeLessThan(without.current.minutesHigh);
  });

  it("slows estimates for a steady crew pace without using age", () => {
    const steady = estimateTreeJobDuration({ ...base, crewPace: "steady" });
    const fast = estimateTreeJobDuration({ ...base, crewPace: "fast" });
    expect(steady.current.minutesHigh).toBeGreaterThan(fast.current.minutesHigh);
  });

  it("recommends material-handling equipment for difficult drag and cleanup", () => {
    const result = estimateTreeJobDuration(base);
    expect(result.recommendedEquipment).toContain("mini_skid");
    expect(result.recommendedEquipment).toContain("chipper");
  });

  it("returns current, no-machinery, and recommended scenarios", () => {
    const result = estimateTreeJobDuration({ ...base, equipment: ["chipper"] });
    expect(result.current.minutesLow).toBeGreaterThan(0);
    expect(result.noMachinery.minutesHigh).toBeGreaterThanOrEqual(result.current.minutesHigh);
    expect(result.recommended.minutesHigh).toBeLessThanOrEqual(result.current.minutesHigh);
  });
});
