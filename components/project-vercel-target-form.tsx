"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Target = {
  id: string;
  name: string;
  orgId: string;
};

type Props = {
  projectId: string;
  currentTarget: Target | null;
  connectionConfigured: boolean;
};

export function ProjectVercelTargetForm({
  projectId,
  currentTarget,
  connectionConfigured
}: Props) {
  const router = useRouter();
  const [projectRef, setProjectRef] = useState(currentTarget?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTarget, setSavedTarget] = useState<Target | null>(currentTarget);

  async function save() {
    if (!projectRef.trim() || saving || !connectionConfigured) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/vercel-target`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectIdOrName: projectRef.trim() })
      });
      const data = (await response.json()) as { target?: Target; error?: string };
      if (!response.ok || !data.target) {
        throw new Error(data.error || "Vercel target could not be saved.");
      }
      setSavedTarget(data.target);
      setProjectRef(data.target.id);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!savedTarget || disconnecting) return;
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/vercel-target`, {
        method: "DELETE"
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Vercel target could not be disconnected.");
      }
      setSavedTarget(null);
      setProjectRef("");
      router.refresh();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error ? disconnectError.message : String(disconnectError)
      );
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {savedTarget ? (
        <div className="panel">
          <strong>Current Vercel target</strong>
          <p style={{ marginBottom: 4 }}>{savedTarget.name}</p>
          <p style={{ margin: 0, opacity: 0.75 }}>
            {savedTarget.id} · account {savedTarget.orgId}
          </p>
        </div>
      ) : null}

      {!connectionConfigured ? (
        <div className="panel">
          <strong>Connect Vercel first</strong>
          <p>
            This project can only bind to the Vercel account connected to its Ziepher workspace. Global operator credentials are never used for customer project deployment.
          </p>
          <a className="button primary" href="/settings/connections">
            Open connected rails
          </a>
        </div>
      ) : null}

      <div className="panel">
        <label htmlFor="vercel-project-ref">
          <strong>Vercel project ID or name</strong>
        </label>
        <p>
          Ziepher will verify this project using the workspace&apos;s encrypted Vercel credential and save Vercel&apos;s canonical project ID and account ID. Deployment jobs snapshot that identity when queued.
        </p>
        <input
          id="vercel-project-ref"
          value={projectRef}
          onChange={(event) => setProjectRef(event.target.value)}
          placeholder="prj_... or my-vercel-project"
          autoComplete="off"
          disabled={!connectionConfigured || saving || disconnecting}
          style={{ width: "100%", marginBottom: 12 }}
        />
        <div className="inline-actions">
          <button
            className="button primary"
            type="button"
            disabled={!connectionConfigured || !projectRef.trim() || saving || disconnecting}
            onClick={save}
          >
            {saving ? "Verifying…" : savedTarget ? "Verify & update target" : "Verify & connect target"}
          </button>
          {savedTarget ? (
            <button
              className="button"
              type="button"
              disabled={saving || disconnecting}
              onClick={disconnect}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect target"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <strong>Safety rule</strong>
        <p style={{ marginBottom: 0 }}>
          Changing or disconnecting this setting cannot redirect a deployment that was already queued. Each deployment keeps the Vercel identity it captured at queue time.
        </p>
      </div>

      {error ? (
        <div className="panel">
          <strong>Vercel target error</strong>
          <p style={{ marginBottom: 0 }}>{error}</p>
        </div>
      ) : null}
    </div>
  );
}
