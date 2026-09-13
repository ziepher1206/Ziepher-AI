"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OperateLeadForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/operate/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        contactName: form.get("contactName"),
        email: form.get("email"),
        phone: form.get("phone"),
        serviceAddress: form.get("serviceAddress"),
        message: form.get("message"),
        source: "manual"
      })
    });

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(body?.error ?? "Unable to save lead.");
      setBusy(false);
      return;
    }

    event.currentTarget.reset();
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="auth-card" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <p className="panel-label">Quick capture</p>
          <h2 style={{ margin: "6px 0 8px" }}>Add a new lead</h2>
          <p className="auth-copy" style={{ margin: 0 }}>Save a phone call, referral, or offline request directly into Ziepher.</p>
        </div>
        <button className="button primary" disabled={busy} type="submit">
          {busy ? "Saving…" : "Save lead"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 20 }}>
        <label className="field">
          <span>Name</span>
          <input name="contactName" required maxLength={160} placeholder="Customer name" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone" maxLength={40} inputMode="tel" placeholder="(555) 555-5555" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" maxLength={320} placeholder="customer@example.com" />
        </label>
        <label className="field">
          <span>Service address</span>
          <input name="serviceAddress" maxLength={500} placeholder="Job or estimate address" />
        </label>
      </div>

      <label className="field" style={{ marginTop: 14 }}>
        <span>What do they need?</span>
        <textarea name="message" maxLength={5000} rows={3} placeholder="Tree removal, trimming, storm damage, stump work…" />
      </label>

      {error ? <p style={{ margin: "12px 0 0", color: "#ffb199" }}>{error}</p> : null}
    </form>
  );
}
