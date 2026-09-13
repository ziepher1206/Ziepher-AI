import { describe, expect, it } from "vitest";
import { agentById, defaultAgentWorkflow, ziepherAgents } from "./registry";

describe("Ziepher agent team", () => {
  it("defines 22 uniquely named specialist agents", () => {
    expect(ziepherAgents).toHaveLength(22);
    expect(new Set(ziepherAgents.map((agent) => agent.id)).size).toBe(22);
    expect(new Set(ziepherAgents.map((agent) => agent.name)).size).toBe(22);
  });

  it("runs every agent exactly once in the default project workflow", () => {
    expect(defaultAgentWorkflow).toHaveLength(22);
    expect(new Set(defaultAgentWorkflow).size).toBe(22);

    for (const agentId of defaultAgentWorkflow) {
      expect(agentById.has(agentId)).toBe(true);
    }
  });

  it("keeps high-impact specialists approval constrained", () => {
    for (const agent of ziepherAgents.filter((item) => item.riskLevel === "high")) {
      expect(agent.mustEscalate.length).toBeGreaterThan(0);
      expect(agent.cannotDo.length).toBeGreaterThan(0);
    }
  });
});
