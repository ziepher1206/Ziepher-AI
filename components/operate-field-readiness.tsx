"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OperateFieldReadiness({
  jobId,
  hasProperty,
  accessNotes,
  hazardNotes,
  treeNotes,
  jobNotes
}: {
  jobId: string;
  hasProperty: boolean;
  accessNotes: string;
  hazardNotes: string;
  treeNotes: string;
  jobNotes: string;
}) {
  const router = useRouter();
  const [access, setAccess] = useState(accessNotes);
  const [hazards, setHazards] = useState(hazardNotes);
  const [trees, setTrees] = useState(treeNotes);
  const [notes, setNotes] = useState(jobNotes);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/operate/jobs/${jobId}/field-readiness`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobNotes: notes,
        ...(hasProperty ? { accessNotes: access, hazardNotes: hazards, treeNotes: trees } : {})
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to save field information.");
      return;
    }
    setMessage("Field information saved.");
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: 900 }}>
      <p className="panel-label">Crew readiness</p>
      <h2 style={{ margin: "6px 0 8px" }}>Before arriving on site</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Keep the crew-facing work notes, property access details, tree context, and known hazards together on the job.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 16 }}>
        <label className="field">
          <span>Work / crew notes</span>
          <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Scope details, cleanup expectations, equipment considerations, customer requests…" />
        </label>
        {hasProperty ? <>
          <label className="field">
            <span>Access notes</span>
            <textarea rows={3} value={access} onChange={(event) => setAccess(event.target.value)} placeholder="Gate width, driveway access, backyard access, parking, locked gate…" />
          </label>
          <label className="field">
            <span>Hazards</span>
            <textarea rows={3} value={hazards} onChange={(event) => setHazards(event.target.value)} placeholder="Power lines, structures, septic, fences, pets, traffic, unstable limbs…" />
          </label>
          <label className="field">
            <span>Tree / site notes</span>
            <textarea rows={4} value={trees} onChange={(event) => setTrees(event.target.value)} placeholder="Tree species/size/location, condition, targets, rigging considerations…" />
          </label>
        </> : <p className="auth-copy">This job does not have a linked property yet. Property-specific access and hazard notes cannot be saved until one is linked.</p>}
        <div className="inline-actions">
          <button className="button primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save field information"}</button>
          {message ? <span className="auth-copy">{message}</span> : null}
        </div>
      </form>
    </section>
  );
}
