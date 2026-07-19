import { describe, expect, it } from "vitest";
import {
  projectSyncPatchSchema,
  projectSyncStateSchema
} from "../lib/domain/schemas";
import {
  emptyProjectSyncState,
  mergeProjectSyncState
} from "../lib/sync/project-state";
import { formatProjectAIContext } from "../lib/ai/project-context";

describe("shared project state", () => {
  it("creates a complete versioned state from an empty payload", () => {
    const state = projectSyncStateSchema.parse({});
    expect(state.schemaVersion).toBe(1);
    expect(state.aiContext.requirements).toEqual([]);
    expect(state.studio).toEqual({});
  });

  it("replaces complete state sections without losing unrelated sections", () => {
    const next = mergeProjectSyncState(emptyProjectSyncState, {
      studio: { prompt: "Build a shared service app", qualityMode: "best" }
    });
    expect(next.studio.qualityMode).toBe("best");
    expect(next.aiContext).toEqual(emptyProjectSyncState.aiContext);

    const updated = mergeProjectSyncState(next, {
      studio: { selectedConcept: "bold-future" }
    });
    expect(updated.studio.prompt).toBe("Build a shared service app");
    expect(updated.studio.qualityMode).toBe("best");
    expect(updated.studio.selectedConcept).toBe("bold-future");
  });

  it("rejects unversioned, empty, or unsafe sync patches", () => {
    expect(() =>
      projectSyncPatchSchema.parse({
        baseRevision: 0,
        eventId: "6ae3a131-1024-44f1-9fa8-44498f177a34",
        deviceId: "web-device-123",
        patch: {}
      })
    ).toThrow();
    expect(() =>
      projectSyncPatchSchema.parse({
        baseRevision: -1,
        eventId: "6ae3a131-1024-44f1-9fa8-44498f177a34",
        deviceId: "web-device-123",
        patch: { studio: { prompt: "x" } }
      })
    ).toThrow();
  });

  it("formats durable AI context as an explicit prompt contract", () => {
    const prompt = formatProjectAIContext({
      vision: "Help small service businesses quote work.",
      targetUsers: ["Owner-operators"],
      requirements: ["One-click install"],
      decisions: ["Supabase first"],
      constraints: ["Billing last"],
      integrations: ["GitHub"],
      notes: []
    });
    expect(prompt).toContain("One-click install");
    expect(prompt).toContain("Billing last");
    expect(prompt).toContain("Supabase first");
  });
});
