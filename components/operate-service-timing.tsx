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

export function OperateServiceTiming({ workspaceId, services }: { workspaceId: string; services: Service[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>, service: Service) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(service.id);
    setMessage(null);
    const rawDuration = String(form.get("duration") ?? "").trim();
    const response = await fetch("/api/operate/setup/service-timing", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        serviceId: service.id,
        defaultDurationMinutes: rawDuration ? Number(rawDuration) : null,
        travelBufferMinutes: Number(form.get("travel") ?? 0),
        preparationBufferMinutes: Number(form.get("prep") ?? 0),
        cleanupBufferMinutes: Number(form.get("cleanup") ?? 0)
      })
    });
    const body = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(body?.error ?? "Unable to save scheduling buffers.");
      return;
    }
    setMessage(`${service.name} scheduling buffers saved.`);
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <p className="panel-label">Scheduling protection</p>
      <h2 style={{ margin: "6px 0 8px" }}>Travel, setup & cleanup buffers</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>
        These minutes are reserved around estimates and jobs so Ziepher cannot book a crew or estimator back-to-back when drive, setup, or cleanup time makes that impossible.
      </p>
      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        {services.filter((service) => service.active).map((service) => (
          <form key={service.id} onSubmit={(event) => save(event, service)} className="project-card" style={{ minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{service.name}</strong>
              <button className="button" disabled={busy === service.id} type="submit">{busy === service.id ? "Saving…" : "Save timing"}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 14 }}>
              <label className="field"><span>Work duration</span><input name="duration" type="number" min="15" max="1440" step="15" defaultValue={service.default_duration_minutes ?? ""} placeholder="60" /></label>
              <label className="field"><span>Travel buffer</span><input name="travel" type="number" min="0" max="240" step="5" defaultValue={service.travel_buffer_minutes ?? 0} /></label>
              <label className="field"><span>Setup / prep</span><input name="prep" type="number" min="0" max="240" step="5" defaultValue={service.preparation_buffer_minutes ?? 0} /></label>
              <label className="field"><span>Cleanup</span><input name="cleanup" type="number" min="0" max="240" step="5" defaultValue={service.cleanup_buffer_minutes ?? 0} /></label>
            </div>
          </form>
        ))}
        {!services.some((service) => service.active) ? <p className="auth-copy">Add or reactivate a service before configuring scheduling buffers.</p> : null}
      </div>
      {message ? <p className="auth-copy" style={{ marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
