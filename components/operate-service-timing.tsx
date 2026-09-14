"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  default_duration_minutes: number | null;
  travel_buffer_minutes: number;
  preparation_buffer_minutes: number;
  cleanup_buffer_minutes: number;
  active: boolean;
};

const durationOptions = [
  { value: "60", label: "About 1 hour" },
  { value: "120", label: "About 2 hours" },
  { value: "180", label: "About 3 hours" },
  { value: "240", label: "Half day · about 4 hours" },
  { value: "360", label: "Most of a day · about 6 hours" },
  { value: "480", label: "Full day · about 8 hours" },
  { value: "720", label: "Long day / large job · about 12 hours" }
];

const bufferOptions = [0, 15, 30, 45, 60, 90, 120];

export function OperateServiceTiming({ workspaceId, services }: { workspaceId: string; services: Service[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>, service: Service) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(service.id);
    setMessage(null);
    const response = await fetch("/api/operate/setup/service-timing", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        serviceId: service.id,
        defaultDurationMinutes: Number(form.get("duration") ?? 240),
        travelBufferMinutes: Number(form.get("travel") ?? 0),
        preparationBufferMinutes: 0,
        cleanupBufferMinutes: 0
      })
    });
    const body = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(body?.error ?? "Unable to save scheduling settings.");
      return;
    }
    setMessage(`${service.name} scheduling settings saved.`);
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <p className="panel-label">Scheduling protection</p>
      <h2 style={{ margin: "6px 0 8px" }}>Simple scheduling defaults</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>
        Pick a rough job length and how much drive-time space Ziepher should leave around the job. Detailed timing can still be changed when the actual job is scheduled.
      </p>
      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        {services.filter((service) => service.active).map((service) => (
          <form key={service.id} onSubmit={(event) => save(event, service)} className="project-card" style={{ minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{service.name}</strong>
              <button className="button" disabled={busy === service.id} type="submit">{busy === service.id ? "Saving…" : "Save"}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginTop: 14 }}>
              <label className="field">
                <span>Typical job length</span>
                <select name="duration" defaultValue={String(service.default_duration_minutes ?? 240)}>
                  {durationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Drive-time buffer</span>
                <select name="travel" defaultValue={String(service.travel_buffer_minutes ?? 0)}>
                  {bufferOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes === 0 ? "No extra buffer" : `${minutes} minutes`}</option>)}
                </select>
              </label>
            </div>
          </form>
        ))}
        {!services.some((service) => service.active) ? <p className="auth-copy">Select at least one service first.</p> : null}
      </div>
      {message ? <p className="auth-copy" style={{ marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
