"use client";

import { useState, useTransition } from "react";

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
  status: string;
  received_at: string;
};

export function OperateLeadInbox({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <p className="panel-label">Lead inbox</p>
          <h2 style={{ margin: "6px 0 0" }}>All incoming opportunities</h2>
        </div>
        <span className="status-pill">{leads.length} total</span>
      </div>
      {error ? <p style={{ marginTop: 14 }}>{error}</p> : null}
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
                  Source: {lead.source ?? "unknown"} · {new Date(lead.received_at).toLocaleString()}
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
          </article>
        ))}
        {!leads.length ? <p className="auth-copy">No leads yet.</p> : null}
      </div>
    </section>
  );
}
