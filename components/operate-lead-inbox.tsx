"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const statuses = [
  "new",
  "contacted",
  "qualified",
  "estimate_scheduled",
  "estimated",
  "won",
  "lost",
  "spam"
] as const;

type Lead = {
  id: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  service_address: string | null;
  message: string | null;
  source: string | null;
  source_detail: string | null;
  status: string;
  received_at: string;
};

export function OperateLeadInbox({ initialLeads }: { initialLeads: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [error, setError] = useState<string | null>(null);
  const [scheduleLeadId, setScheduleLeadId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStatus(leadId: string, status: string) {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/operate/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error ?? "Unable to update lead.");
        return;
      }
      setLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, status } : lead));
    });
  }

  async function scheduleEstimate(event: FormEvent<HTMLFormElement>, lead: Lead) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const localStart = String(form.get("startsAt") ?? "");
    const parsed = new Date(localStart);
    if (!localStart || Number.isNaN(parsed.getTime())) {
      setError("Choose a valid estimate date and time.");
      return;
    }

    const response = await fetch(`/api/operate/leads/${lead.id}/schedule-estimate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title") ?? `Estimate — ${lead.contact_name}`),
        startsAt: parsed.toISOString(),
        durationMinutes: Number(form.get("durationMinutes") ?? 60)
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error ?? "Unable to schedule estimate.");
      return;
    }

    setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status: "estimate_scheduled" } : item));
    setScheduleLeadId(null);
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <p className="panel-label">Lead inbox</p>
          <h2 style={{ margin: "6px 0 0" }}>All incoming opportunities</h2>
        </div>
        <span className="status-pill">{leads.length} total</span>
      </div>
      {error ? <p style={{ marginTop: 14, color: "#ffb199" }}>{error}</p> : null}
      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        {leads.map((lead) => (
          <article key={lead.id} style={{ borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 18, alignItems: "start" }}>
              <div>
                <strong>{lead.contact_name}</strong>
                <div className="auth-copy" style={{ marginTop: 4, fontSize: 14 }}>
                  {lead.phone ?? lead.email ?? "Contact details unavailable"}
                  {lead.service_address ? ` · ${lead.service_address}` : ""}
                </div>
                {lead.message ? <p className="auth-copy" style={{ margin: "8px 0 0", fontSize: 14 }}>{lead.message}</p> : null}
                <div className="auth-copy" style={{ marginTop: 7, fontSize: 12 }}>
                  Source: {lead.source ?? "Unknown"}{lead.source_detail ? ` · ${lead.source_detail}` : ""} · {new Date(lead.received_at).toLocaleString()}
                </div>
              </div>
              <select
                aria-label={`Status for ${lead.contact_name}`}
                className="button"
                disabled={isPending}
                value={lead.status}
                onChange={(event) => updateStatus(lead.id, event.target.value)}
              >
                {statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
            </div>

            {!['lost', 'spam', 'estimate_scheduled', 'estimated', 'won'].includes(lead.status) ? (
              <div style={{ marginTop: 12 }}>
                <button className="button primary" type="button" onClick={() => setScheduleLeadId(scheduleLeadId === lead.id ? null : lead.id)}>
                  {scheduleLeadId === lead.id ? "Cancel scheduling" : "Schedule estimate"}
                </button>
              </div>
            ) : null}

            {scheduleLeadId === lead.id ? (
              <form onSubmit={(event) => scheduleEstimate(event, lead)} style={{ display: "grid", gap: 12, marginTop: 14, padding: 14, border: "1px solid rgba(255,255,255,.09)", borderRadius: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
                  <label className="field">
                    <span>Estimate title</span>
                    <input name="title" required maxLength={180} defaultValue={`Estimate — ${lead.contact_name}`} />
                  </label>
                  <label className="field">
                    <span>Date & time</span>
                    <input name="startsAt" type="datetime-local" required />
                  </label>
                  <label className="field">
                    <span>Duration</span>
                    <select name="durationMinutes" defaultValue="60">
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                    </select>
                  </label>
                </div>
                <div className="auth-copy" style={{ fontSize: 13 }}>
                  Ziepher will create or reuse the customer, create the service property when an address is available, create the estimate, and add the confirmed appointment to your schedule in one transaction.
                </div>
                <div><button className="button primary" type="submit">Confirm estimate appointment</button></div>
              </form>
            ) : null}
          </article>
        ))}
        {!leads.length ? <p className="auth-copy">No leads yet.</p> : null}
      </div>
    </section>
  );
}
