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
type WorkspaceMember = { user_id: string; role: string };
type CrewMember = { id: string; crew_id: string; user_id: string; is_lead: boolean };
type AvailabilityRule = {
  id: string;
  resource_crew_id: string | null;
  day_of_week: number;
  starts_at_local: string;
  ends_at_local: string;
  active: boolean;
};

type Props = {
  workspaceId: string;
  services: Service[];
  crews: Crew[];
  workspaceMembers: WorkspaceMember[];
  crewMembers: CrewMember[];
  availabilityRules: AvailabilityRule[];
};

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function numberOrNull(value: FormDataEntryValue | null, multiplier = 1) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * multiplier) : null;
}

function shortMember(member: WorkspaceMember) {
  return `${member.role} · ${member.user_id.slice(0, 8)}`;
}

export function OperateBusinessSetup({ workspaceId, services, crews, workspaceMembers, crewMembers, availabilityRules }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(body: unknown, key: string) {
    setBusy(key);
    setError(null);
    const response = await fetch("/api/operate/setup/crew-staffing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to update crew setup.");
      return false;
    }
    router.refresh();
    return true;
  }

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

  async function assignMember(event: FormEvent<HTMLFormElement>, crewId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userId = String(form.get("userId") ?? "");
    if (!userId) return;
    const ok = await request({ action: "assign_member", workspaceId, crewId, userId, isLead: form.get("isLead") === "on" }, `assign-${crewId}`);
    if (ok) event.currentTarget.reset();
  }

  async function removeMember(crewId: string, userId: string) {
    await request({ action: "remove_member", workspaceId, crewId, userId }, `remove-${crewId}-${userId}`);
  }

  async function saveHours(event: FormEvent<HTMLFormElement>, crewId: string, dayOfWeek: number) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request({
      action: "set_hours",
      workspaceId,
      crewId,
      dayOfWeek,
      active: form.get("active") === "on",
      startsAtLocal: String(form.get("startsAtLocal") ?? ""),
      endsAtLocal: String(form.get("endsAtLocal") ?? "")
    }, `hours-${crewId}-${dayOfWeek}`);
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
        <h2 style={{ margin: "6px 0 8px" }}>Crews, staffing & hours</h2>
        <p className="auth-copy" style={{ marginTop: 0 }}>Create crews, assign existing workspace members, mark crew leads, and set normal weekly working hours used by scheduling.</p>
        <form onSubmit={createCrew} style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginTop: 18 }}>
          <label className="field" style={{ flex: "1 1 260px" }}><span>Crew name</span><input name="name" required maxLength={160} placeholder="Crew 1" /></label>
          <button className="button primary" disabled={!!busy} type="submit">{busy === "crew" ? "Adding…" : "Add crew"}</button>
        </form>

        <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
          {crews.map((crew) => {
            const members = crewMembers.filter((member) => member.crew_id === crew.id);
            const assigned = new Set(members.map((member) => member.user_id));
            return (
              <article key={crew.id} className="project-card" style={{ minHeight: 0, display: "grid", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div><strong>{crew.name}</strong><div className="auth-copy" style={{ marginTop: 4 }}>{crew.active ? "Available for scheduling" : "Paused"} · {members.length} member{members.length === 1 ? "" : "s"}</div></div>
                  <button className="button" disabled={!!busy} onClick={() => setActive("crew", crew.id, !crew.active)}>{busy === crew.id ? "Saving…" : crew.active ? "Pause crew" : "Reactivate"}</button>
                </div>

                <div>
                  <p className="panel-label">Crew members</p>
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {members.map((membership) => {
                      const member = workspaceMembers.find((item) => item.user_id === membership.user_id);
                      return <div key={membership.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="auth-copy">{member ? shortMember(member) : membership.user_id.slice(0, 8)}{membership.is_lead ? " · Crew lead" : ""}</span>
                        <button className="button" disabled={!!busy} onClick={() => removeMember(crew.id, membership.user_id)}>{busy === `remove-${crew.id}-${membership.user_id}` ? "Removing…" : "Remove"}</button>
                      </div>;
                    })}
                    {!members.length ? <p className="auth-copy" style={{ margin: 0 }}>No members assigned yet.</p> : null}
                  </div>
                  <form onSubmit={(event) => assignMember(event, crew.id)} style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", marginTop: 12 }}>
                    <label className="field" style={{ flex: "1 1 240px" }}><span>Add workspace member</span><select name="userId" defaultValue="" required><option value="" disabled>Select member</option>{workspaceMembers.filter((member) => !assigned.has(member.user_id)).map((member) => <option key={member.user_id} value={member.user_id}>{shortMember(member)}</option>)}</select></label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 10 }}><input type="checkbox" name="isLead" /> Crew lead</label>
                    <button className="button" disabled={!!busy || workspaceMembers.every((member) => assigned.has(member.user_id))} type="submit">{busy === `assign-${crew.id}` ? "Adding…" : "Add member"}</button>
                  </form>
                </div>

                <div>
                  <p className="panel-label">Normal weekly hours</p>
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {days.map((day, dayOfWeek) => {
                      const rule = availabilityRules.find((item) => item.resource_crew_id === crew.id && item.day_of_week === dayOfWeek);
                      return <form key={day} onSubmit={(event) => saveHours(event, crew.id, dayOfWeek)} style={{ display: "grid", gridTemplateColumns: "minmax(110px,1fr) repeat(2,minmax(110px,150px)) auto auto", gap: 8, alignItems: "end" }}>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 10 }}><input type="checkbox" name="active" defaultChecked={rule?.active ?? (dayOfWeek >= 1 && dayOfWeek <= 5)} /> {day}</label>
                        <label className="field"><span>Start</span><input type="time" name="startsAtLocal" defaultValue={rule?.starts_at_local?.slice(0, 5) ?? "08:00"} /></label>
                        <label className="field"><span>End</span><input type="time" name="endsAtLocal" defaultValue={rule?.ends_at_local?.slice(0, 5) ?? "17:00"} /></label>
                        <button className="button" disabled={!!busy} type="submit">{busy === `hours-${crew.id}-${dayOfWeek}` ? "Saving…" : "Save"}</button>
                        <span className="status-pill">{rule?.active ? "Working" : "Off"}</span>
                      </form>;
                    })}
                  </div>
                </div>
              </article>
            );
          })}
          {!crews.length ? <p className="auth-copy">No crews configured yet.</p> : null}
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
