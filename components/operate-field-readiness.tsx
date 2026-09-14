"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const equipmentOptions = [
  ["chipper", "Chipper"],
  ["bucket_truck", "Bucket truck"],
  ["crane", "Crane"],
  ["stump_grinder", "Stump grinder"],
  ["mini_skid", "Mini skid"],
  ["trailer", "Trailer"],
  ["climbing_gear", "Climbing gear"],
  ["traffic_control", "Traffic control gear"]
] as const;

export function OperateFieldReadiness({
  jobId,
  hasProperty,
  accessNotes,
  hazardNotes,
  treeNotes,
  jobNotes,
  requiredEquipment,
  powerLineHazard,
  trafficControlRequired,
  structureRisk,
  weatherSensitive,
  completionWorkVerified,
  completionCleanupVerified,
  completionNotes
}: {
  jobId: string;
  hasProperty: boolean;
  accessNotes: string;
  hazardNotes: string;
  treeNotes: string;
  jobNotes: string;
  requiredEquipment: string[];
  powerLineHazard: boolean;
  trafficControlRequired: boolean;
  structureRisk: boolean;
  weatherSensitive: boolean;
  completionWorkVerified: boolean;
  completionCleanupVerified: boolean;
  completionNotes: string;
}) {
  const router = useRouter();
  const [access, setAccess] = useState(accessNotes);
  const [hazards, setHazards] = useState(hazardNotes);
  const [trees, setTrees] = useState(treeNotes);
  const [notes, setNotes] = useState(jobNotes);
  const [equipment, setEquipment] = useState<string[]>(requiredEquipment);
  const [powerLine, setPowerLine] = useState(powerLineHazard);
  const [traffic, setTraffic] = useState(trafficControlRequired);
  const [structure, setStructure] = useState(structureRisk);
  const [weather, setWeather] = useState(weatherSensitive);
  const [workVerified, setWorkVerified] = useState(completionWorkVerified);
  const [cleanupVerified, setCleanupVerified] = useState(completionCleanupVerified);
  const [completion, setCompletion] = useState(completionNotes);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleEquipment(value: string) {
    setEquipment((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/operate/jobs/${jobId}/field-readiness`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobNotes: notes,
        requiredEquipment: equipment,
        powerLineHazard: powerLine,
        trafficControlRequired: traffic,
        structureRisk: structure,
        weatherSensitive: weather,
        completionWorkVerified: workVerified,
        completionCleanupVerified: cleanupVerified,
        completionNotes: completion,
        ...(hasProperty ? { accessNotes: access, hazardNotes: hazards, treeNotes: trees } : {})
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to save field information.");
      return;
    }
    setMessage("Crew readiness saved.");
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: 900 }}>
      <p className="panel-label">Crew readiness</p>
      <h2 style={{ margin: "6px 0 8px" }}>Field plan & completion proof</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Keep scope, access, hazards, required equipment, and the completion checklist in one mobile-friendly job record.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 16 }}>
        <label className="field">
          <span>Work / crew notes</span>
          <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Scope details, cleanup expectations, rigging plan, customer requests…" />
        </label>

        {hasProperty ? <>
          <label className="field"><span>Access notes</span><textarea rows={3} value={access} onChange={(event) => setAccess(event.target.value)} placeholder="Gate width, driveway access, backyard access, parking, locked gate…" /></label>
          <label className="field"><span>Hazard notes</span><textarea rows={3} value={hazards} onChange={(event) => setHazards(event.target.value)} placeholder="Dead limbs, septic, fences, pets, terrain, traffic, nearby targets…" /></label>
          <label className="field"><span>Tree / site notes</span><textarea rows={4} value={trees} onChange={(event) => setTrees(event.target.value)} placeholder="Species, size, location, condition, targets, rigging considerations…" /></label>
        </> : <p className="auth-copy">This job has no linked property yet, so property-specific access and site notes cannot be saved.</p>}

        <div>
          <strong>Structured hazard flags</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginTop: 10 }}>
            <label className="button" style={{ justifyContent: "flex-start" }}><input type="checkbox" checked={powerLine} onChange={(event) => setPowerLine(event.target.checked)} /> Power lines / electrical</label>
            <label className="button" style={{ justifyContent: "flex-start" }}><input type="checkbox" checked={structure} onChange={(event) => setStructure(event.target.checked)} /> Structure / target risk</label>
            <label className="button" style={{ justifyContent: "flex-start" }}><input type="checkbox" checked={traffic} onChange={(event) => setTraffic(event.target.checked)} /> Traffic control needed</label>
            <label className="button" style={{ justifyContent: "flex-start" }}><input type="checkbox" checked={weather} onChange={(event) => setWeather(event.target.checked)} /> Weather-sensitive work</label>
          </div>
        </div>

        <div>
          <strong>Required equipment</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginTop: 10 }}>
            {equipmentOptions.map(([value, label]) => (
              <label key={value} className="button" style={{ justifyContent: "flex-start" }}>
                <input type="checkbox" checked={equipment.includes(value)} onChange={() => toggleEquipment(value)} /> {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <strong>Completion checklist</strong>
          <p className="auth-copy" style={{ margin: "6px 0 10px" }}>Both boxes plus at least one After photo are required before Ziepher will complete the job and create its invoice.</p>
          <div style={{ display: "grid", gap: 10 }}>
            <label className="button" style={{ justifyContent: "flex-start" }}><input type="checkbox" checked={workVerified} onChange={(event) => setWorkVerified(event.target.checked)} /> Scope completed and verified</label>
            <label className="button" style={{ justifyContent: "flex-start" }}><input type="checkbox" checked={cleanupVerified} onChange={(event) => setCleanupVerified(event.target.checked)} /> Cleanup completed and site left ready</label>
          </div>
          <label className="field" style={{ marginTop: 12 }}><span>Completion notes</span><textarea rows={3} value={completion} onChange={(event) => setCompletion(event.target.value)} placeholder="Final walkthrough, customer notes, exceptions, remaining recommendations…" /></label>
        </div>

        <div className="inline-actions">
          <button className="button primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save crew readiness"}</button>
          {message ? <span className="auth-copy">{message}</span> : null}
        </div>
      </form>
    </section>
  );
}
