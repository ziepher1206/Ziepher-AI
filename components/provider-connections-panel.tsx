"use client";

import { useCallback, useEffect, useState } from "react";

type GitHubConnection = {
  connected: boolean;
  status: "connected" | "needs_attention" | "disconnected";
  displayName?: string | null;
  scopes?: string[];
  accessTokenExpiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  needsAttentionReason?: string | null;
};

export function ProviderConnectionsPanel() {
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/github", {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Could not read GitHub connection status.");
      setConnection((await response.json()) as GitHubConnection);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load connections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function disconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/github", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not disconnect GitHub.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not disconnect GitHub.");
    } finally {
      setDisconnecting(false);
    }
  }

  const connected = connection?.connected === true;
  const attention = connection?.status === "needs_attention";

  return (
    <section className="connection-card">
      <div className="connection-heading">
        <div>
          <span className="panel-label">Source control</span>
          <h2>GitHub</h2>
        </div>
        <span className={`connection-status ${connected ? "connected" : attention ? "attention" : ""}`}>
          {loading ? "Checking" : connected ? "Connected" : attention ? "Needs attention" : "Not connected"}
        </span>
      </div>

      <p className="auth-copy">
        Ziepher uses GitHub as the source of truth for generated code, isolated branches,
        pull requests, approvals, and recoverable production changes.
      </p>

      {connection?.displayName ? (
        <p className="connection-account">Connected as <strong>{connection.displayName}</strong></p>
      ) : null}

      {attention && connection?.needsAttentionReason ? (
        <p className="connection-warning">{connection.needsAttentionReason}</p>
      ) : null}

      {error ? <p className="connection-warning">{error}</p> : null}

      <div className="inline-actions connection-actions">
        {connected ? (
          <>
            <a className="button primary" href="/api/connections/github/start">
              Reauthorize GitHub
            </a>
            <button className="button" type="button" onClick={disconnect} disabled={disconnecting}>
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </>
        ) : (
          <a className="button primary" href="/api/connections/github/start">
            {attention ? "Reconnect GitHub" : "Connect GitHub"}
          </a>
        )}
        <button className="button" type="button" onClick={() => void load()} disabled={loading}>
          Refresh status
        </button>
      </div>

      <p className="connection-note">
        OAuth tokens are stored encrypted on the server. They are never returned by this page or exposed to generated applications.
      </p>
    </section>
  );
}
