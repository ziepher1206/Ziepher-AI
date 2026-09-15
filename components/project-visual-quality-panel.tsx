"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Payload = {
  build: null | {
    id: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
  };
  score: number | null;
  warnings: string[];
  ready: boolean;
};

function qualityLabel(score: number | null) {
  if (score === null) return "Checking";
  if (score >= 90) return "Strong";
  if (score >= 80) return "Good";
  if (score >= 70) return "Needs polish";
  return "Needs improvement";
}

export function ProjectVisualQualityPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/visual-quality`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load design quality.");
        if (!cancelled) setData(payload as Payload);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load design quality.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const refinementInstructions = useMemo(() => {
    if (!data?.warnings.length) return "Improve the visual polish while preserving the current approved structure and content.";
    return `Improve the current preview using these Design Quality findings:\n- ${data.warnings.join("\n- ")}`;
  }, [data]);

  if (error) return null;
  if (!data?.build) return null;

  return (
    <section className="project-card" style={{ display: "grid", gap: 12 }}>
      <div className="project-card-top">
        <div>
          <p className="panel-label">Design Quality</p>
          <h2 style={{ margin: "4px 0" }}>
            {data.score === null ? "Build analysis" : `${data.score}/100`}
          </h2>
        </div>
        <span className={`status-pill ${data.score !== null && data.score >= 85 ? "free" : ""}`}>
          {qualityLabel(data.score)}
        </span>
      </div>

      {!data.ready ? (
        <p>Z-Life is still finishing this build. Quality findings will update with the completed preview.</p>
      ) : data.warnings.length ? (
        <>
          <p>Z-Life found visual areas worth improving before this project is treated as finished.</p>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 7 }}>
            {data.warnings.slice(0, 4).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <div>
            <Link
              className="button primary"
              href={{
                pathname: `/projects/${projectId}/changes`,
                query: {
                  source: "visual_qa",
                  title: "Improve design quality",
                  instructions: refinementInstructions
                }
              }}
            >
              Improve these areas
            </Link>
          </div>
        </>
      ) : (
        <p>No major zero-cost visual-quality warnings were detected in the latest generated preview.</p>
      )}

      <small>This check uses local rules only. It does not spend AI credits or publish anything.</small>
    </section>
  );
}
