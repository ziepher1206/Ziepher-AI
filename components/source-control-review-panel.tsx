"use client";

import { useCallback, useEffect, useState } from "react";

type SourceControlRun = {
  id: string;
  stage: string;
  revision: number;
  repositoryFullName: string;
  baseBranch: string;
  workingBranch: string;
  headSha: string | null;
  pullRequestNumber: number | null;
  previewUrl: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  mergedSha: string | null;
  mergedAt: string | null;
  blockedReason: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = { projectId: string };

function shortSha(value: string | null) {
  return value ? value.slice(0, 10) : "—";
}

function stageLabel(stage: string) {
  return stage.replaceAll("_", " ");
}

export function SourceControlReviewPanel({ projectId }: Props) {
  const [run, setRun] = useState<SourceControlRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/source-control`, {
        cache: "no-store"
      });
      const data = (await response.json()) as {
        run?: SourceControlRun | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not load build review.");
      setRun(data.run ?? null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function approve() {
    if (!run || run.stage !== "preview_ready") return;
    setApproving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/source-control`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: run.id, revision: run.revision })
      });
      const data = (await response.json()) as {
        run?: SourceControlRun;
        error?: string;
      };
      if (!response.ok || !data.run) {
        throw new Error(data.error || "Approval failed.");
      }
      setRun(data.run);
    } catch (approvalError) {
      setError(
        approvalError instanceof Error ? approvalError.message : String(approvalError)
      );
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return <p>Loading build review…</p>;
  }

  if (!run) {
    return (
      <section className="billing-shell">
        <h2>No source-control run yet</h2>
        <p>
          Bind this project to GitHub and complete a validated build. Ziepher will create
          the isolated branch, PR, checks, and preview automatically.
        </p>
      </section>
    );
  }

  const pullRequestUrl = run.pullRequestNumber
    ? `https://github.com/${run.repositoryFullName}/pull/${run.pullRequestNumber}`
    : null;
  const canApprove = run.stage === "preview_ready";

  return (
    <section className="billing-shell">
      <div className="settings-intro" style={{ padding: 0, marginBottom: 24 }}>
        <span className="panel-label">Source control</span>
        <h1 style={{ marginTop: 8 }}>Build review</h1>
        <p>
          Ziepher will never merge this generated build until an owner or admin approves
          the exact reviewed commit. Approval does not deploy production.
        </p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div className="panel">
          <strong style={{ textTransform: "capitalize" }}>{stageLabel(run.stage)}</strong>
          <p style={{ marginBottom: 0 }}>
            {run.repositoryFullName} · {run.baseBranch} · head {shortSha(run.headSha)}
          </p>
        </div>

        <div className="panel">
          <strong>Review targets</strong>
          <div className="inline-actions" style={{ marginTop: 12 }}>
            {run.previewUrl ? (
              <a className="button" href={run.previewUrl} target="_blank" rel="noreferrer">
                Open verified preview
              </a>
            ) : null}
            {pullRequestUrl ? (
              <a className="button" href={pullRequestUrl} target="_blank" rel="noreferrer">
                Open GitHub PR #{run.pullRequestNumber}
              </a>
            ) : null}
          </div>
        </div>

        {run.blockedReason || run.lastError ? (
          <div className="panel">
            <strong>Needs attention</strong>
            <p>{run.blockedReason || run.lastError}</p>
          </div>
        ) : null}

        {run.approvedAt ? (
          <div className="panel">
            <strong>Approval recorded</strong>
            <p>
              {new Date(run.approvedAt).toLocaleString()} · approved exact head {shortSha(run.headSha)}
            </p>
          </div>
        ) : null}

        {run.mergedAt ? (
          <div className="panel">
            <strong>Merged</strong>
            <p>
              {new Date(run.mergedAt).toLocaleString()} · merge {shortSha(run.mergedSha)}
            </p>
          </div>
        ) : null}

        {canApprove ? (
          <div className="panel">
            <strong>Ready for your approval</strong>
            <p>
              Review the preview and PR first. Clicking below authorizes Ziepher to merge
              only head {shortSha(run.headSha)} after GitHub checks are re-verified.
            </p>
            <button className="button primary" type="button" disabled={approving} onClick={approve}>
              {approving ? "Approving…" : "Approve exact build & merge"}
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="panel">
            <strong>Review error</strong>
            <p>{error}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
