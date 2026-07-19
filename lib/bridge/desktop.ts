export type DesktopBridgeInfo = {
  bridgeVersion: string;
  deviceId: string;
  platform: "windows" | "macos" | "linux" | "unknown";
  connected: boolean;
  workspaceName?: string | null;
  capabilities: string[];
};

export type DesktopWorkspaceScan = {
  workspaceName: string;
  files: Array<{
    path: string;
    size: number;
    modifiedAtMs: number;
    sha256?: string | null;
  }>;
  checkpointSha256: string;
  truncated: boolean;
};

type TauriInternals = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
  }
}

function invoke<T>(command: string, args?: Record<string, unknown>) {
  const internals = window.__TAURI_INTERNALS__;
  if (!internals) throw new Error("The Ziepher desktop bridge is not available in this browser.");
  return internals.invoke<T>(command, args);
}

export function isDesktopBridgeAvailable() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__?.invoke);
}

export const desktopBridge = {
  info() {
    return invoke<DesktopBridgeInfo>("bridge_info");
  },
  chooseWorkspace() {
    return invoke<{ name: string } | null>("bridge_choose_workspace");
  },
  disconnect() {
    return invoke<void>("bridge_disconnect");
  },
  scanWorkspace() {
    return invoke<DesktopWorkspaceScan>("bridge_scan_workspace");
  },
  readFile(relativePath: string) {
    return invoke<{
      path: string;
      content: string;
      sha256: string;
      size: number;
    }>("bridge_read_file", { relativePath });
  },
  writeFile(relativePath: string, content: string, expectedSha256?: string) {
    return invoke<{
      path: string;
      sha256: string;
      size: number;
      backupPath?: string | null;
    }>("bridge_write_file", {
      relativePath,
      content,
      expectedSha256: expectedSha256 ?? null
    });
  }
};
