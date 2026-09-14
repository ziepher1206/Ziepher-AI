"use client";

import { useMemo, useState } from "react";
import { estimateTreeJobDuration, type EquipmentType } from "@/lib/operate/tree-duration-estimator";

const equipmentOptions: { value: EquipmentType; label: string }[] = [
  { value: "chipper", label: "Chipper" },
  { value: "bucket_truck", label: "Bucket truck" },
  { value: "crane", label: "Crane" },
  { value: "stump_grinder", label: "Stump grinder" },
  { value: "mini_skid", label: "Mini skid / loader" },
  { value: "trailer", label: "Trailer" },
  { value: "climbing_gear", label: "Climbing gear" },
  { value: "traffic_control", label: "Traffic control" }
];

function timeLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
}

function scenarioLabel(low: number, high: number) {
  return `${timeLabel(low)} – ${timeLabel(high)}`;
}

export function OperateDurationEstimator({ serviceText }: { serviceText: string }) {
  const [treeCount, setTreeCount] = useState(1);
  const [treeSize, setTreeSize] = useState<"small" | "medium" | "large" | "very_large">("medium");
  const [access, setAccess] = useState<"easy" | "normal" | "difficult">("normal");
  const [slope, setSlope] = useState<"easy" | "normal" | "difficult">("normal");
  const [dragDistance, setDragDistance] = useState<"easy" | "normal" | "difficult">("normal");
  const [cleanup, setCleanup] = useState<"light" | "standard" | "heavy">("standard");
  const [crewSize, setCrewSize] = useState(3);
  const [crewPace, setCrewPace] = useState<"steady" | "standard" | "fast">("standard");
  const [experienceLevel, setExperienceLevel] = useState<"developing" | "experienced" | "expert">("experienced");
  const [requiresClimbing, setRequiresClimbing] = useState(false);
  const [requiresRigging, setRequiresRigging] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentType[]>(["chipper"]);

  const result = useMemo(() => estimateTreeJobDuration({
    serviceText,
    treeCount,
    treeSize,
    access,
    slope,
    dragDistance,
    cleanup,
    crewSize,
    crewPace,
    experienceLevel,
    requiresClimbing,
    requiresRigging,
    equipment
  }), [serviceText, treeCount, treeSize, access, slope, dragDistance, cleanup, crewSize, crewPace, experienceLevel, requiresClimbing, requiresRigging, equipment]);

  function toggleEquipment(value: EquipmentType) {
    setEquipment((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <p className="panel-label">Ziepher job-time estimator</p>
          <h2 style={{ margin: "6px 0 8px" }}>Estimate how long this work should take</h2>
          <p className="auth-copy" style={{ margin: 0, maxWidth: 760 }}>
            Ziepher compares the work, crew capability, site conditions, and equipment. Crew pace should reflect observed job performance—not age or other personal traits.
          </p>
        </div>
        <span className="status-pill">{result.confidence} confidence</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 18 }}>
        <label className="field"><span>Number of trees</span><input type="number" min={1} max={100} value={treeCount} onChange={(e) => setTreeCount(Math.max(1, Number(e.target.value) || 1))} /></label>
        <label className="field"><span>Typical tree size</span><select value={treeSize} onChange={(e) => setTreeSize(e.target.value as typeof treeSize)}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="very_large">Very large</option></select></label>
        <label className="field"><span>Crew size</span><select value={crewSize} onChange={(e) => setCrewSize(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map((count) => <option key={count} value={count}>{count} worker{count === 1 ? "" : "s"}</option>)}</select></label>
        <label className="field"><span>Crew work pace</span><select value={crewPace} onChange={(e) => setCrewPace(e.target.value as typeof crewPace)}><option value="steady">Steady</option><option value="standard">Standard</option><option value="fast">Fast</option></select></label>
        <label className="field"><span>Crew experience</span><select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value as typeof experienceLevel)}><option value="developing">Developing</option><option value="experienced">Experienced</option><option value="expert">Expert</option></select></label>
        <label className="field"><span>Property access</span><select value={access} onChange={(e) => setAccess(e.target.value as typeof access)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="difficult">Difficult</option></select></label>
        <label className="field"><span>Material drag / carry</span><select value={dragDistance} onChange={(e) => setDragDistance(e.target.value as typeof dragDistance)}><option value="easy">Short / easy</option><option value="normal">Normal</option><option value="difficult">Long / difficult</option></select></label>
        <label className="field"><span>Terrain</span><select value={slope} onChange={(e) => setSlope(e.target.value as typeof slope)}><option value="easy">Flat / easy</option><option value="normal">Normal</option><option value="difficult">Steep / difficult</option></select></label>
        <label className="field"><span>Cleanup volume</span><select value={cleanup} onChange={(e) => setCleanup(e.target.value as typeof cleanup)}><option value="light">Light</option><option value="standard">Standard</option><option value="heavy">Heavy</option></select></label>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={requiresClimbing} onChange={(e) => setRequiresClimbing(e.target.checked)} /> Climbing required</label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={requiresRigging} onChange={(e) => setRequiresRigging(e.target.checked)} /> Rigging required</label>
      </div>

      <div style={{ marginTop: 18 }}>
        <p className="panel-label">Equipment available for this job</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9 }}>
          {equipmentOptions.map((option) => (
            <button key={option.value} type="button" className={`button${equipment.includes(option.value) ? " primary" : ""}`} onClick={() => toggleEquipment(option.value)}>{option.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginTop: 20 }}>
        <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">With selected equipment</p><strong style={{ fontSize: 24 }}>{scenarioLabel(result.current.minutesLow, result.current.minutesHigh)}</strong></div>
        <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">Without machinery</p><strong style={{ fontSize: 24 }}>{scenarioLabel(result.noMachinery.minutesLow, result.noMachinery.minutesHigh)}</strong></div>
        <div className="project-card" style={{ minHeight: 0 }}><p className="panel-label">With recommended setup</p><strong style={{ fontSize: 24 }}>{scenarioLabel(result.recommended.minutesLow, result.recommended.minutesHigh)}</strong></div>
      </div>

      <div style={{ marginTop: 16 }}>
        <p className="auth-copy" style={{ margin: 0 }}><strong>Recommended equipment:</strong> {result.recommendedEquipment.length ? result.recommendedEquipment.map((item) => item.replaceAll("_", " ")).join(", ") : "No additional machinery recommendation."}</p>
        {result.drivers.length ? <p className="auth-copy" style={{ marginBottom: 0 }}><strong>Main time drivers:</strong> {result.drivers.join(", ")}.</p> : null}
      </div>
    </section>
  );
}
