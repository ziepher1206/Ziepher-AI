"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type RepositoryOption = {
  fullName: string;
  url: string;
  defaultBranch: string;
  private: boolean;
};

type CurrentRepository = {
  fullName: string;
  url: string | null;
  defaultBranch: string | null;
} | null;

export function ProjectRepositoryPicker({
  projectId,
  repositories,
  currentRepository,
  discoveryError
}: {
  projectId: string;
  repositories: RepositoryOption[];
  currentRepository: CurrentRepository;
  discoveryError?: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(
    currentRepository?.fullName ?? repositories[0]?.fullName ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/repository`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryFullName: selected })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not connect repository.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not connect repository.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!currentRepository || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/repository`, {
        method: "DELETE"
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not disconnect repository.");
      }
      setSelected(repositories[0]?.fullName ?? "");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not disconnect repository.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="billing-disabled">
      <span className="panel-label">GitHub source of truth</span>
      <h2>{currentRepository ? "Repository connected" : "Choose a repository"}</h2>
      <p className="auth-copy">
        Ziepher will use this repository as the durable source of truth for generated code.
        Future build runs will create isolated branches and pull requests instead of writing to
        the production branch directly.
      </p>

      {currentRepository ? (
        <p>
          <strong>{currentRepository.fullName}</strong>
          <br />
          <small>Default branch: {currentRepository.defaultBranch ?? "unknown"}</small>
        </p>
      ) : null}

      {discoveryError ? (
        <div>
          <p className="error-banner">{discoveryError}</p>
          <Link className="button" href="/settings/connections">
            Open GitHub connection settings
          </Link>
        </div>
      ) : repositories.length ? (
        <label className="field">
          <span>Writable GitHub repository</span>
          <select
            className="quality-select"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            disabled={saving}
          >
            {repositories.map((repository) => (
              <option key={repository.fullName} value={repository.fullName}>
                {repository.fullName} · {repository.defaultBranch}
                {repository.private ? " · private" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="auth-copy">
          No writable active repositories were returned by the connected GitHub account.
        </p>
      )}

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="inline-actions" style={{ marginTop: 18 }}>
        <button
          className="button primary"
          type="button"
          onClick={save}
          disabled={!selected || saving || Boolean(discoveryError)}
        >
          {saving ? "Saving…" : currentRepository ? "Change repository" : "Connect repository"}
        </button>
        {currentRepository ? (
          <button className="button" type="button" onClick={disconnect} disabled={saving}>
            Disconnect repository
          </button>
        ) : null}
      </div>
    </section>
  );
}
