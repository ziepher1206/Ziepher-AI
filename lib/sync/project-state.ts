import {
  emptyProjectAIContext,
  projectSyncStateSchema,
  type ProjectSyncState
} from "../domain/schemas";

export const emptyProjectSyncState: ProjectSyncState = {
  schemaVersion: 1,
  studio: {},
  aiContext: emptyProjectAIContext,
  bridge: {}
};

export function parseProjectSyncState(value: unknown): ProjectSyncState {
  return projectSyncStateSchema.parse(value ?? emptyProjectSyncState);
}

export function mergeProjectSyncState(
  current: ProjectSyncState,
  patch: Partial<ProjectSyncState>
): ProjectSyncState {
  return parseProjectSyncState({
    ...current,
    ...patch,
    studio: patch.studio
      ? { ...current.studio, ...patch.studio }
      : current.studio,
    aiContext: patch.aiContext
      ? { ...current.aiContext, ...patch.aiContext }
      : current.aiContext,
    bridge: patch.bridge
      ? { ...current.bridge, ...patch.bridge }
      : current.bridge
  });
}

export function createSyncEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  // Modern supported browsers and Tauri provide randomUUID. This fallback is
  // for older embedded webviews and still supplies RFC 4122 variant/version bits.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getOrCreateDeviceId() {
  const key = "ziepher-sync-device-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const created = `web-${createSyncEventId()}`;
  window.localStorage.setItem(key, created);
  return created;
}
