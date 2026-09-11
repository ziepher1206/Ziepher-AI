"use client";

type Props = {
  projectId?: string;
  onCheckpoint: (workspaceName: string, sha256: string) => Promise<void>;
};

/**
 * Legacy compatibility mount retained so the Studio shell does not need a risky
 * large-file rewrite. Native Tauri clients are no longer part of the active
 * product, so this component must stay inert in the browser.
 */
export function DesktopBridgeControl({ projectId, onCheckpoint }: Props) {
  void projectId;
  void onCheckpoint;
  return null;
}
