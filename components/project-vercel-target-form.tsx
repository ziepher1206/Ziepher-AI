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
  availableTargets: Target[];
  discoveryError: string | null;
};

export function ProjectVercelTargetForm({
  projectId,
  currentTarget,
  connectionConfigured,
  availableTargets,
  discoveryError
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

      {connectionConfigured && availableTargets.length > 0 ? (
        <div className="panel">
          <label htmlFor="vercel-project-select">
            <strong>Choose an accessible Vercel project</strong>
          </label>
          <p>
            These projects came directly from the workspace&apos;s connected Vercel account. Ziepher will still re-verify the selected project before binding it.
          </p>
          <select
            id="vercel-project-select"
            value={availableTargets.some((target) => target.id === projectRef) ? projectRef : ""}
            onChange={(event) => setProjectRef(event.target.value)}
            disabled={saving || disconnecting}
            style={{ width: "100%" }}
          >
            <option value="">Select a Vercel project…</option>
            {availableTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name} · {target.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {connectionConfigured && availableTargets.length === 0 && !discoveryError ? (
        <div className="panel">
          <strong>No accessible Vercel projects found</strong>
          <p style={{ marginBottom: 0 }}>
            The connected account is valid, but Vercel did not return a project to choose from. You can still enter a known project ID or name below.
          </p>
        </div>
      ) : null}

      {discoveryError ? (
        <div className="panel">
          <strong>Could not load Vercel projects</strong>
          <p style={{ marginBottom: 0 }}>{discoveryError}</p>
        </div>
      ) : null}

      <div className="panel">
        <label htmlFor="vercel-project-ref">
          <strong>{availableTargets.length ? "Or enter a Vercel project ID or name" : "Vercel project ID or name"}</strong>
        </label>
        <p>
          Ziepher verifies the exact project using the workspace&apos;s encrypted Vercel credential and saves Vercel&apos;s canonical project ID and account ID. Deployment jobs snapshot that identity when queued.
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
          Discovery never grants authority by itself. The selected target is re-validated with Vercel before saving, and changing or disconnecting this setting cannot redirect a deployment that was already queued.
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
