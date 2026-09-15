import { completionPercent, type BuildProgress } from "@/lib/zlife-build-progress";

export function ZLifeProgressMeter({ progress }: { progress: BuildProgress }) {
  const percent = completionPercent(progress);

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 14 }} aria-label={`${progress.label} is ${percent}% complete`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <strong style={{ fontSize: 13, letterSpacing: ".04em" }}>{percent}% COMPLETE</strong>
        <span style={{ fontSize: 12, opacity: 0.75 }}>{progress.status.toUpperCase()}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.12)" }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg,#ff7a18,#ffb347)",
          }}
        />
      </div>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, opacity: 0.8 }}>
        Next: {progress.next}
      </p>
    </div>
  );
}
