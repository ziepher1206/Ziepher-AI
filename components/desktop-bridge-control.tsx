"use client";

import { useEffect, useState } from "react";
import {
  desktopBridge,
  isDesktopBridgeAvailable,
  type DesktopBridgeInfo
} from "@/lib/bridge/desktop";

type Props = {
  projectId?: string;
  onCheckpoint: (workspaceName: string, sha256: string) => Promise<void>;
};

export function DesktopBridgeControl({ projectId, onCheckpoint }: Props) {
  const [available, setAvailable] = useState(false);
  const [info, setInfo] = useState<DesktopBridgeInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const detected = isDesktopBridgeAvailable();
      setAvailable(detected);
      if (detected) {
        void desktopBridge
          .info()
          .then(setInfo)
          .catch(() => setMessage("Bridge unavailable"));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!available) return null;

  async function register(nextInfo: DesktopBridgeInfo) {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/bridge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: nextInfo.deviceId,
        deviceName: nextInfo.workspaceName
          ? `${nextInfo.workspaceName} desktop`
          : "Ziepher desktop",
        platform: nextInfo.platform,
        bridgeVersion: nextInfo.bridgeVersion,
        workspaceHint: nextInfo.workspaceName,
        capabilities: nextInfo.capabilities
      })
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Unable to register desktop bridge.");
    }
  }

  async function connect() {
    setBusy(true);
    setMessage(null);
    try {
      const selected = await desktopBridge.chooseWorkspace();
      if (!selected) return;
      const nextInfo = await desktopBridge.info();
      const scan = await desktopBridge.scanWorkspace();
      setInfo(nextInfo);
      await register(nextInfo);
      await onCheckpoint(scan.workspaceName, scan.checkpointSha256);
      setMessage(`${scan.files.length} files connected`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to connect folder");
    } finally {
      setBusy(false);
    }
  }

  async function checkpoint() {
    setBusy(true);
    setMessage(null);
    try {
      const scan = await desktopBridge.scanWorkspace();
      await onCheckpoint(scan.workspaceName, scan.checkpointSha256);
      setMessage(`${scan.files.length} files checked`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to scan folder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="desktop-bridge-control" title={message ?? undefined}>
      <button
        className={`button ${info?.connected ? "bridge-connected" : ""}`}
        type="button"
        disabled={busy}
        onClick={() => void (info?.connected ? checkpoint() : connect())}
      >
        {busy
          ? "Bridge…"
          : info?.connected
            ? `Local: ${info.workspaceName ?? "connected"}`
            : "Connect local folder"}
      </button>
      {message ? <span className="bridge-message">{message}</span> : null}
    </div>
  );
}
