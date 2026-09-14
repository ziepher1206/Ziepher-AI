"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Service = { id: string; name: string; active: boolean };

const treeServiceOptions = [
  "Tree removal",
  "Tree trimming / pruning",
  "Stump grinding",
  "Stump removal",
  "Storm cleanup",
  "Emergency tree service",
  "Tree health / inspection",
  "Cabling / bracing",
  "Lot / land clearing",
  "Brush removal",
  "Crane-assisted tree removal",
  "Tree planting"
];

export function OperateServiceSelector({ workspaceId, services }: { workspaceId: string; services: Service[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    if (!name) return;

    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/operate/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "service",
        workspaceId,
        name,
        description: null,
        defaultDurationMinutes: null,
        preparationBufferMinutes: 0,
        cleanupBufferMinutes: 0,
        basePriceCents: null
      })
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(body?.error ?? "Unable to add service.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  const selectedNames = new Set(services.filter((service) => service.active).map((service) => service.name));
  const available = treeServiceOptions.filter((service) => !selectedNames.has(service));

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <p className="panel-label">Tree service catalog</p>
      <h2 style={{ margin: "6px 0 8px" }}>Services you offer</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Choose a service and tap Add service. That is all you need here. Pricing, timing, scope, and job details are handled later when they are actually needed.</p>

      <form onSubmit={addService} style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", marginTop: 18 }}>
        <label className="field" style={{ flex: "1 1 260px" }}>
          <span>Service type</span>
          <select name="name" defaultValue="" required disabled={!available.length}>
            <option value="" disabled>{available.length ? "Choose a service" : "All standard services added"}</option>
            {available.map((service) => <option key={service} value={service}>{service}</option>)}
          </select>
        </label>
        <button className="button primary" type="submit" disabled={busy || !available.length}>{busy ? "Adding…" : "Add service"}</button>
      </form>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        {services.filter((service) => service.active).map((service) => <span key={service.id} className="status-pill">{service.name}</span>)}
        {!services.some((service) => service.active) ? <span className="auth-copy">No services added yet.</span> : null}
      </div>
      {message ? <p className="form-error" style={{ marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
