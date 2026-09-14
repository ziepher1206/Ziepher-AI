"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OperateEstimateSiteContext({
  estimateId,
  hasProperty,
  accessNotes,
  hazardNotes,
  treeNotes,
  disabled
}: {
  estimateId: string;
  hasProperty: boolean;
  accessNotes: string;
  hazardNotes: string;
  treeNotes: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [access, setAccess] = useState(accessNotes);
  const [hazards, setHazards] = useState(hazardNotes);
  const [trees, setTrees] = useState(treeNotes);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasProperty || disabled) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/operate/estimates/${estimateId}/site-context`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessNotes: access, hazardNotes: hazards, treeNotes: trees })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to save site context.");
      return;
    }
    setMessage("Site context saved for the estimate and future field job.");
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: 900 }}>
      <p className="panel-label">Property handoff</p>
      <h2 style={{ margin: "6px 0 8px" }}>Access, hazards & tree notes</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Capture what the estimator sees now so the information follows the property into scheduling and the crew&apos;s field job.</p>
      {!hasProperty ? <p className="auth-copy">This estimate has no linked property, so site-specific notes cannot be saved yet.</p> : (
        <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <label className="field">
            <span>Access notes</span>
            <textarea rows={3} maxLength={4000} disabled={disabled || busy} value={access} onChange={(event) => setAccess(event.target.value)} placeholder="Gate width, driveway, backyard access, parking, locked gates…" />
          </label>
          <label className="field">
            <span>Hazard notes</span>
            <textarea rows={3} maxLength={4000} disabled={disabled || busy} value={hazards} onChange={(event) => setHazards(event.target.value)} placeholder="Power lines, dead limbs, septic, fences, pets, traffic, terrain, nearby targets…" />
          </label>
          <label className="field">
            <span>Tree / site notes</span>
            <textarea rows={4} maxLength={8000} disabled={disabled || busy} value={trees} onChange={(event) => setTrees(event.target.value)} placeholder="Species, approximate size, condition, location, targets, rigging considerations…" />
          </label>
          <div className="inline-actions">
            <button className="button primary" type="submit" disabled={disabled || busy}>{busy ? "Saving…" : "Save site context"}</button>
            {disabled ? <span className="auth-copy">This estimate is closed, so its property handoff is read-only here.</span> : null}
            {message ? <span className="auth-copy">{message}</span> : null}
          </div>
        </form>
      )}
    </section>
  );
}
