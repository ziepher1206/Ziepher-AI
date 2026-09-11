"use client";

import { useCallback, useState } from "react";
import styles from "./provider-connections-panel.module.css";

export type VercelConnectionStatus = {
  connected: boolean;
  status: "connected" | "needs_attention" | "disconnected";
  displayName?: string | null;
  accountId?: string | null;
  teamId?: string | null;
  scopes?: string[];
  needsAttentionReason?: string | null;
};

export function VercelConnectionPanel({
  initialConnection
}: {
  initialConnection: VercelConnectionStatus;
}) {
  const [connection, setConnection] = useState(initialConnection);
  const [accessToken, setAccessToken] = useState("");
  const [teamId, setTeamId] = useState(initialConnection.teamId ?? "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/vercel", { cache: "no-store" });
      const data = (await response.json()) as VercelConnectionStatus & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not read Vercel connection status.");
      setConnection(data);
      if (data.teamId) setTeamId(data.teamId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Vercel connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function connect() {
    if (!accessToken.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/vercel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          teamId: teamId.trim()
        })
      });
      const data = (await response.json()) as VercelConnectionStatus & { error?: string };
      if (!response.ok || !data.connected) {
        throw new Error(data.error || "Could not connect Vercel.");
      }
      setConnection(data);
      setAccessToken("");
      if (data.teamId) setTeamId(data.teamId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not connect Vercel.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/vercel", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not disconnect Vercel.");
      setConnection({ connected: false, status: "disconnected" });
      setAccessToken("");
      setTeamId("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not disconnect Vercel.");
    } finally {
      setDisconnecting(false);
    }
  }

  const connected = connection.connected === true;
  const attention = connection.status === "needs_attention";

  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <div>
          <span className="panel-label">Deployment rail</span>
          <h2>Vercel</h2>
        </div>
        <span
          className={`${styles.status} ${connected ? styles.connected : attention ? styles.attention : ""}`}
        >
          {loading
            ? "Checking"
            : connected
              ? "Connected"
              : attention
                ? "Needs attention"
                : "Not connected"}
        </span>
      </div>

      <p className="auth-copy">
        Connect the Vercel account or team this workspace is allowed to deploy into. Ziepher validates the credential before encrypting it at rest.
      </p>

      {connection.displayName ? (
        <p className={styles.account}>
          Connected to <strong>{connection.displayName}</strong>
          {connection.accountId ? ` · ${connection.accountId}` : ""}
        </p>
      ) : null}

      {attention && connection.needsAttentionReason ? (
        <p className={styles.warning}>{connection.needsAttentionReason}</p>
      ) : null}
      {error ? <p className={styles.warning}>{error}</p> : null}

      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <label>
          <strong>Vercel access token</strong>
          <input
            type="password"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            placeholder={connected ? "Paste a new token to reauthorize" : "Paste Vercel access token"}
            autoComplete="new-password"
            disabled={saving || disconnecting}
            style={{ width: "100%", marginTop: 6 }}
          />
        </label>
        <label>
          <strong>Team ID (optional)</strong>
          <input
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            placeholder="team_..."
            autoComplete="off"
            disabled={saving || disconnecting}
            style={{ width: "100%", marginTop: 6 }}
          />
        </label>
      </div>

      <div className={`inline-actions ${styles.actions}`}>
        <button
          className="button primary"
          type="button"
          onClick={connect}
          disabled={!accessToken.trim() || saving || disconnecting}
        >
          {saving ? "Validating…" : connected ? "Reauthorize Vercel" : "Connect Vercel"}
        </button>
        {connected || attention ? (
          <button className="button" type="button" onClick={disconnect} disabled={disconnecting || saving}>
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : null}
        <button className="button" type="button" onClick={() => void load()} disabled={loading || saving}>
          Refresh status
        </button>
      </div>

      <p className={styles.note}>
        The token is sent only to the authenticated Ziepher server, validated against Vercel, encrypted before database storage, and never returned to the browser after submission. Use a Team ID when projects live under a Vercel team.
      </p>
    </section>
  );
}
