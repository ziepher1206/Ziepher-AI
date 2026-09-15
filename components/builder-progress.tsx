import Link from "next/link";

type BuilderStage = 1 | 2 | 3 | 4 | 5;

const stages = [
  { step: 1 as const, label: "Build", suffix: "" },
  { step: 2 as const, label: "References", suffix: "/media" },
  { step: 3 as const, label: "Preview & Refine", suffix: "/studio" },
  { step: 4 as const, label: "Domain", suffix: "/domains" },
  { step: 5 as const, label: "Publish Ready", suffix: "/publish" }
];

export function BuilderProgress({
  projectId,
  currentStage
}: {
  projectId: string;
  currentStage: BuilderStage;
}) {
  return (
    <nav aria-label="Builder progress" className="project-card" style={{ padding: 12, overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 8, minWidth: 660 }}>
        {stages.map((stage) => {
          const current = stage.step === currentStage;
          const complete = stage.step < currentStage;
          const href = stage.step === 1 ? "/projects" : `/projects/${projectId}${stage.suffix}`;
          return (
            <Link
              key={stage.step}
              href={href}
              aria-current={current ? "step" : undefined}
              style={{
                flex: 1,
                minWidth: 118,
                textDecoration: "none",
                borderRadius: 12,
                padding: "10px 12px",
                border: current ? "1px solid rgba(127,255,212,.75)" : "1px solid rgba(255,255,255,.10)",
                background: current ? "rgba(127,255,212,.10)" : "rgba(255,255,255,.025)",
                color: current || complete ? "#dffbf4" : "#8faaa7"
              }}
            >
              <div style={{ fontSize: 11, opacity: .76, marginBottom: 3 }}>
                {complete ? "✓" : stage.step} · Step {stage.step}
              </div>
              <strong style={{ fontSize: 13 }}>{stage.label}</strong>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
