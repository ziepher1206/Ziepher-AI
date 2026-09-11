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
  productionDeploymentId: string | null;
  productionRequestedBy: string | null;
  productionRequestedAt: string | null;
  productionUrl: string | null;
  productionVerifiedAt: string | null;
  blockedReason: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type DeploymentStatus = {
  id: string;
  environment: string;
  status: string;
  providerDeploymentId: string | null;
  url: string | null;
  failureMessage: string | null;
  vercelProjectId: string | null;
  vercelProjectName: string | null;
  providerAttemptedAt: string | null;
  providerReconcileAttempts: number;
  providerLastObservedState: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

type DeploymentPair = {
  preview: DeploymentStatus | null;
  production: DeploymentStatus | null;
};

type Props = { projectId: string };

function shortSha(value: string | null) {
  return value ? value.slice(0, 10) : "—";
}

function stageLabel(stage: string) {
  return stage.replaceAll("_", " ");
}

function deploymentStateLabel(deployment: DeploymentStatus) {
  if (
    deployment.status === "deploying" &&
    deployment.providerAttemptedAt &&
    deployment.providerLastObservedState === "NOT_FOUND"
  ) {
    return "Reconciling provider acceptance";
  }
  if (deployment.status === "deploying" && deployment.providerLastObservedState) {
    return `Vercel ${deployment.providerLastObservedState.toLowerCase()}`;
  }
  return stageLabel(deployment.status);
}

function DeploymentRecoveryCard({
  title,
  deployment
}: {
  title: string;
  deployment: DeploymentStatus | null;
}) {
  if (!deployment) return null;

  return (
    <div className="panel">
      <strong>{title}</strong>
      <p style={{ marginBottom: 6, textTransform: "capitalize" }}>
        {deploymentStateLabel(deployment)}
      </p>
      <p style={{ margin: 0, opacity: 0.78 }}>
        Target {deployment.vercelProjectName ?? "unavailable"}
        {deployment.vercelProjectId ? ` · ${deployment.vercelProjectId}` : ""}
      </p>
      {deployment.providerDeploymentId ? (
        <p style={{ margin: "6px 0 0", opacity: 0.78 }}>
          Vercel deployment {deployment.providerDeploymentId}
        </p>
      ) : null}
      {deployment.providerAttemptedAt ? (
        <p style={{ margin: "6px 0 0", opacity: 0.78 }}>
          Provider attempt started {new Date(deployment.providerAttemptedAt).toLocaleString()}
        </p>
      ) : null}
      {deployment.providerReconcileAttempts > 0 ? (
        <p style={{ margin: "6px 0 0", opacity: 0.78 }}>
          Reconciliation checks: {deployment.providerReconcileAttempts}
          {deployment.providerLastObservedState
            ? ` · last observed ${deployment.providerLastObservedState}`
            : ""}
        </p>
      ) : null}
      {deployment.failureMessage ? (
        <p style={{ margin: "10px 0 0" }}>{deployment.failureMessage}</p>
      ) : null}
      {deployment.url ? (
        <div className="inline-actions" style={{ marginTop: 12 }}>
          <a className="button" href={deployment.url} target="_blank" rel="noreferrer">
            Open {deployment.environment}
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function SourceControlReviewPanel({ projectId }: Props) {
  const [run, setRun] = useState<SourceControlRun | null>(null);
  const [deployments, setDeployments] = useState<DeploymentPair>({
    preview: null,
    production: null
  });
  const [productionReleaseEnabled, setProductionReleaseEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/source-control`, {
        cache: "no-store"
      });
      const data = (await response.json()) as {
        run?: SourceControlRun | null;
        deployments?: DeploymentPair;
        productionReleaseEnabled?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not load build review.");
      setRun(data.run ?? null);
      setDeployments(
        data.deployments ?? {
          preview: null,
          production: null
        }
      );
      setProductionReleaseEnabled(data.productionReleaseEnabled === true);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
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

  async function releaseProduction() {
    if (!run || run.stage !== "merged" || !productionReleaseEnabled) return;
    const confirmed = window.confirm(
      `Deploy merge ${shortSha(run.mergedSha)} to production? This is a live production action.`
    );
    if (!confirmed) return;

    setReleasing(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/source-control/production`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ runId: run.id, revision: run.revision })
        }
      );
      const data = (await response.json()) as {
        deploymentId?: string;
        error?: string;
      };
      if (!response.ok || !data.deploymentId) {
        throw new Error(data.error || "Production release request failed.");
      }
      await load();
    } catch (releaseError) {
      setError(
        releaseError instanceof Error ? releaseError.message : String(releaseError)
      );
    } finally {
      setReleasing(false);
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
  const canRequestProduction =
    run.stage === "merged" &&
    productionReleaseEnabled &&
    (!run.productionRequestedAt || Boolean(run.lastError));

  return (
    <section className="billing-shell">
      <div className="settings-intro" style={{ padding: 0, marginBottom: 24 }}>
        <span className="panel-label">Source control</span>
        <h1 style={{ marginTop: 8 }}>Build review</h1>
        <p>
          Ziepher will never merge this generated build until an owner or admin approves
          the exact reviewed commit. Production is a separate explicit release.
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
            {run.productionUrl ? (
              <a className="button" href={run.productionUrl} target="_blank" rel="noreferrer">
                Open production
              </a>
            ) : null}
          </div>
        </div>

        <DeploymentRecoveryCard title="Preview deployment" deployment={deployments.preview} />
        <DeploymentRecoveryCard
          title="Production deployment"
          deployment={deployments.production}
        />

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

        {run.productionRequestedAt ? (
          <div className="panel">
            <strong>Production release requested</strong>
            <p>
              {new Date(run.productionRequestedAt).toLocaleString()} · linked deployment {run.productionDeploymentId?.slice(0, 8) ?? "—"}
            </p>
          </div>
        ) : null}

        {run.productionVerifiedAt ? (
          <div className="panel">
            <strong>Production verified</strong>
            <p>
              {new Date(run.productionVerifiedAt).toLocaleString()} · exact merged build is live
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

        {run.stage === "merged" && !productionReleaseEnabled ? (
          <div className="panel">
            <strong>Production release locked</strong>
            <p>
              The merge is safe in GitHub. Production deployment remains disabled until the
              Vercel production rail is explicitly enabled by the operator.
            </p>
          </div>
        ) : null}

        {canRequestProduction ? (
          <div className="panel">
            <strong>{run.lastError ? "Retry production release" : "Ready for production release"}</strong>
            <p>
              This is separate from merge approval. Ziepher will re-check that {run.baseBranch}
              still points exactly to merge {shortSha(run.mergedSha)} before queueing the live deployment.
            </p>
            <button
              className="button primary"
              type="button"
              disabled={releasing}
              onClick={releaseProduction}
            >
              {releasing ? "Requesting…" : "Deploy exact merge to production"}
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
