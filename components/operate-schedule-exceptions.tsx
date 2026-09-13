"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Crew = { id: string; name: string; active: boolean };
type ScheduleOverride = {
  id: string;
  resource_type: "workspace" | "crew" | "user";
  resource_crew_id: string | null;
  mode: "open" | "block";
  starts_at: string;
  ends_at: string;
  note: string | null;
};

type Props = {
  workspaceId: string;
  timezone: string | null;
  crews: Crew[];
  overrides: ScheduleOverride[];
};

function localInputToIso(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid date and time.");
  return date.toISOString();
}

function displayDate(value: string, timezone: string | null) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone ?? undefined
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

export function OperateScheduleExceptions({ workspaceId, timezone, crews, overrides }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resourceType, setResourceType] = useState<"workspace" | "crew">("crew");

  async function createOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/operate/setup/schedule-overrides", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          resourceType,
          crewId: resourceType === "crew" ? form.get("crewId") : null,
          mode: form.get("mode"),
          startsAt: localInputToIso(String(form.get("startsAt") ?? "")),
          endsAt: localInputToIso(String(form.get("endsAt") ?? "")),
          note: form.get("note")
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save schedule exception.");
      event.currentTarget.reset();
      setResourceType("crew");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save schedule exception.");
    } finally {
      setBusy(null);
    }
  }

  async function removeOverride(id: string) {
    setBusy(id);
    setError(null);
    const response = await fetch("/api/operate/setup/schedule-overrides", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, overrideId: id })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload?.error ?? "Unable to remove schedule exception.");
    setBusy(null);
    if (response.ok) router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <p className="panel-label">Scheduling exceptions</p>
      <h2 style={{ margin: "6px 0 8px" }}>Temporary blocks & special openings</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>
        Block a crew or the whole business for weather, vacation, equipment downtime, or other interruptions. Use Open to allow a special work window outside normal weekly hours. Blocks always win.
      </p>
      {!timezone ? <p className="form-error">Save the business timezone above before relying on local schedule exceptions.</p> : null}

      <form onSubmit={createOverride} style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <label className="field"><span>Applies to</span><select value={resourceType} onChange={(event) => setResourceType(event.target.value as "workspace" | "crew")}><option value="crew">Specific crew</option><option value="workspace">Whole business</option></select></label>
          {resourceType === "crew" ? <label className="field"><span>Crew</span><select name="crewId" required defaultValue=""><option value="" disabled>Select crew</option>{crews.filter((crew) => crew.active).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select></label> : null}
          <label className="field"><span>Type</span><select name="mode" defaultValue="block"><option value="block">Block time</option><option value="open">Special opening</option></select></label>
          <label className="field"><span>Starts</span><input name="startsAt" type="datetime-local" required /></label>
          <label className="field"><span>Ends</span><input name="endsAt" type="datetime-local" required /></label>
        </div>
        <label className="field"><span>Reason / note</span><input name="note" maxLength={500} placeholder="Weather shutdown, vacation, crane maintenance…" /></label>
        <div><button className="button primary" disabled={!!busy || (resourceType === "crew" && !crews.some((crew) => crew.active))} type="submit">{busy === "create" ? "Saving…" : "Add exception"}</button></div>
      </form>

      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        {overrides.map((item) => {
          const crew = crews.find((candidate) => candidate.id === item.resource_crew_id);
          return <div key={item.id} className="project-card" style={{ minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
              <div>
                <strong>{item.mode === "block" ? "Blocked" : "Open"} · {item.resource_type === "workspace" ? "Whole business" : crew?.name ?? "Crew"}</strong>
                <p className="auth-copy" style={{ margin: "5px 0 0" }}>{displayDate(item.starts_at, timezone)} → {displayDate(item.ends_at, timezone)}{item.note ? ` · ${item.note}` : ""}</p>
              </div>
              <button className="button" disabled={!!busy} onClick={() => removeOverride(item.id)}>{busy === item.id ? "Removing…" : "Remove"}</button>
            </div>
          </div>;
        })}
        {!overrides.length ? <p className="auth-copy">No upcoming schedule exceptions.</p> : null}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
