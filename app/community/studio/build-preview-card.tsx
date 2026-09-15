"use client";

import { useEffect, useState } from "react";

const PREVIEW_PR_KEY = "zlife.contributor.preview-pr.v1";

type PreviewResult = {
  pullNumber?: number;
  pullState?: string;
  headSha?: string;
  previewUrl?: string | null;
  previewState?: string;
  inspectorUrl?: string | null;
  message?: string;
  error?: string;
};

export default function BuildPreviewCard() {
  const [pullRequestUrl, setPullRequestUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "waiting" | "error">("idle");
  const [result, setResult] = useState<PreviewResult | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(PREVIEW_PR_KEY);
    if (saved) setPullRequestUrl(saved);
  }, []);

  async function findPreview() {
    if (!pullRequestUrl.trim()) return;
    setState("loading");
    setResult(null);
    window.localStorage.setItem(PREVIEW_PR_KEY, pullRequestUrl.trim());

    try {
      const response = await fetch("/api/community/build-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pullRequestUrl: pullRequestUrl.trim() }),
      });
      const payload = await response.json().catch(() => null) as PreviewResult | null;
      setResult(payload);
      if (!response.ok) {
        setState("error");
      } else if (payload?.previewUrl) {
        setState("ready");
      } else {
        setState("waiting");
      }
    } catch {
      setResult({ error: "ZLife could not check the preview right now." });
      setState("error");
    }
  }

  return (
    <section className="zlife-studio-panel">
      <div className="zlife-studio-panel-head">
        <div>
          <p className="zlife-kicker">PREVIEW MY BUILD</p>
          <h2>See your changes while you build.</h2>
          <p>
            Open a draft pull request early, paste it here once, and ZLife will find the safe preview deployment. Every push to that PR refreshes the preview automatically, so you can build, look, fix, and repeat without touching production.
          </p>
        </div>
        <span className="zlife-studio-sandbox-badge">Preview only</span>
      </div>

      <div className="zlife-studio-profile-grid" style={{ marginTop: 14 }}>
        <label>
          Your ZLife pull request
          <input
            type="url"
            value={pullRequestUrl}
            onChange={(event) => {
              setPullRequestUrl(event.target.value.slice(0, 300));
              setState("idle");
              setResult(null);
            }}
            placeholder="https://github.com/ziepher1206/Ziepher-AI/pull/123"
          />
          <small>Use a draft PR while you are still building. It does not need to be ready for review yet.</small>
        </label>

        <div className="zlife-hero-actions" style={{ alignItems: "end" }}>
          <button
            className="zlife-primary"
            type="button"
            onClick={() => void findPreview()}
            disabled={state === "loading" || !pullRequestUrl.trim()}
          >
            {state === "loading" ? "Finding preview…" : "Preview My Build"} <span>→</span>
          </button>
        </div>
      </div>

      {state === "ready" && result?.previewUrl ? (
        <div className="zlife-community-empty" style={{ marginTop: 14 }}>
          <strong>Preview ready.</strong>
          <p style={{ marginTop: 6 }}>{result.message ?? "Your latest build is available in a safe preview deployment."}</p>
          <div className="zlife-hero-actions" style={{ marginTop: 10 }}>
            <a className="zlife-primary" href={result.previewUrl} target="_blank" rel="noreferrer">Open Live Preview <span>→</span></a>
            <button className="zlife-secondary" type="button" onClick={() => void findPreview()}>Refresh Preview Status</button>
          </div>
          <small style={{ display: "block", marginTop: 8 }}>PR #{result.pullNumber} · {result.previewState ?? "ready"} · this is not production.</small>
        </div>
      ) : null}

      {state === "waiting" ? (
        <div className="zlife-community-empty" style={{ marginTop: 14 }}>
          <strong>Preview is still building.</strong>
          <p style={{ marginTop: 6 }}>{result?.message ?? "Vercel has not published a preview URL for the latest commit yet."}</p>
          <div className="zlife-hero-actions" style={{ marginTop: 10 }}>
            <button className="zlife-secondary" type="button" onClick={() => void findPreview()}>Check Again</button>
            {result?.inspectorUrl ? <a className="zlife-secondary" href={result.inspectorUrl} target="_blank" rel="noreferrer">View Build Status</a> : null}
          </div>
        </div>
      ) : null}

      {state === "error" ? (
        <p className="zlife-community-empty" style={{ marginTop: 14 }}>{result?.error ?? "ZLife could not find that preview."}</p>
      ) : null}

      <p className="zlife-community-empty" style={{ marginTop: 14 }}>
        Recommended workflow: choose a task → create a draft PR → Preview My Build → keep pushing fixes → submit for review when it is actually ready. Preview access never grants production credentials, customer data, billing access, or deployment authority.
      </p>
    </section>
  );
}
