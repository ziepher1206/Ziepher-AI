"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  description: string | null;
  default_duration_minutes: number | null;
  preparation_buffer_minutes: number;
  cleanup_buffer_minutes: number;
  base_price_cents: number | null;
  active: boolean;
};

type Crew = { id: string; name: string; active: boolean };

type Props = { workspaceId: string; services: Service[]; crews: Crew[] };

function numberOrNull(value: FormDataEntryValue | null, multiplier = 1) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * multiplier) : null;
}

export function OperateBusinessSetup({ workspaceId, services, crews }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("service");
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/operate/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "service",
        workspaceId,
        name: form.get("name"),
        description: form.get("description"),
        defaultDurationMinutes: numberOrNull(form.get("duration")),
        preparationBufferMinutes: numberOrNull(form.get("prep")) ?? 0,
        cleanupBufferMinutes: numberOrNull(form.get("cleanup")) ?? 0,
        basePriceCents: numberOrNull(form.get("price"), 100)
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body?.error ?? "Unable to add service.");
      setBusy(null);
      return;
    }
    event.currentTarget.reset();
    setBusy(null);
    router.refresh();
  }

  async function createCrew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("crew");
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/operate/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "crew", workspaceId, name: form.get("name") })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body?.error ?? "Unable to add crew.");
      setBusy(null);
      return;
    }
    event.currentTarget.reset();
    setBusy(null);
    router.refresh();
  }

  async function setActive(entity: "service" | "crew", id: string, active: boolean) {
    setBusy(id);
    setError(null);
    const response = await fetch("/api/operate/setup", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, entity, id, active })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body?.error ?? "Unable to update item.");
    setBusy(null);
    if (response.ok) router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="auth-card" style={{ maxWidth: "none" }}>
        <p className="panel-label">Tree service catalog</p>
        <h2 style={{ margin: "6px 0 8px" }}>Services</h2>
        <p className="auth-copy" style={{ marginTop: 0 }}>Set up the work your company sells. Duration and price are defaults that can still be changed on individual estimates.</p>
        <form onSubmit={createService} style={{ display: "grid", gap: 12, marginTop: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <label className="field"><span>Service name</span><input name="name" required maxLength={160} placeholder="Tree removal" /></label>
            <label className="field"><span>Typical duration (minutes)</span><input name="duration" type="number" min="15" max="1440" step="15" placeholder="180" /></label>
            <label className="field"><span>Starting price</span><input name="price" type="number" min="0" step="0.01" placeholder="0.00" /></label>
            <label className="field"><span>Prep buffer (minutes)</span><input name="prep" type="number" min="0" max="240" step="5" defaultValue="0" /></label>
            <label className="field"><span>Cleanup buffer (minutes)</span><input name="cleanup" type="number" min="0" max="240" step="5" defaultValue="0" /></label>
          </div>
          <label className="field"><span>Description</span><textarea name="description" rows={2} maxLength={1000} placeholder="What is normally included?" /></label>
          <div><button className="button primary" disabled={!!busy} type="submit">{busy === "service" ? "Adding…" : "Add service"}</button></div>
        </form>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          {services.map((service) => (
            <div key={service.id} className="project-card" style={{ minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                <div><strong>{service.name}</strong><p className="auth-copy" style={{ margin: "5px 0 0" }}>{service.description || "No description"}{service.default_duration_minutes ? ` · ${service.default_duration_minutes} min` : ""}{service.base_price_cents != null ? ` · $${(service.base_price_cents / 100).toFixed(2)} starting` : ""}</p></div>
                <button className="button" disabled={!!busy} onClick={() => setActive("service", service.id, !service.active)}>{busy === service.id ? "Saving…" : service.active ? "Pause service" : "Reactivate"}</button>
              </div>
            </div>
          ))}
          {!services.length ? <p className="auth-copy">No services configured yet. Add the first tree-service offering above.</p> : null}
        </div>
      </section>

      <section className="auth-card" style={{ maxWidth: "none" }}>
        <p className="panel-label">Field operations</p>
        <h2 style={{ margin: "6px 0 8px" }}>Crews</h2>
        <p className="auth-copy" style={{ marginTop: 0 }}>Create the crews that can be assigned to scheduled jobs. Crew-member invitations can be layered on separately.</p>
        <form onSubmit={createCrew} style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginTop: 18 }}>
          <label className="field" style={{ flex: "1 1 260px" }}><span>Crew name</span><input name="name" required maxLength={160} placeholder="Crew 1" /></label>
          <button className="button primary" disabled={!!busy} type="submit">{busy === "crew" ? "Adding…" : "Add crew"}</button>
        </form>
        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          {crews.map((crew) => (
            <div key={crew.id} className="project-card" style={{ minHeight: 0, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div><strong>{crew.name}</strong><div className="auth-copy" style={{ marginTop: 4 }}>{crew.active ? "Available for scheduling" : "Paused"}</div></div>
              <button className="button" disabled={!!busy} onClick={() => setActive("crew", crew.id, !crew.active)}>{busy === crew.id ? "Saving…" : crew.active ? "Pause crew" : "Reactivate"}</button>
            </div>
          ))}
          {!crews.length ? <p className="auth-copy">No crews configured yet.</p> : null}
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
