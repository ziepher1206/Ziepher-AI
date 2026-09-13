"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PublicContext = {
  label: string;
  businessName: string;
  businessPhone: string | null;
  businessEmail: string | null;
  serviceArea: string | null;
  emergencyService: boolean;
};

export function PublicTreeServiceRequestForm({ token }: { token: string }) {
  const submissionId = useMemo(() => crypto.randomUUID(), []);
  const [context, setContext] = useState<PublicContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/public/leads/${token}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error ?? "Request form unavailable.");
        if (active) setContext(payload as PublicContext);
      })
      .catch((error) => active && setLoadError(error instanceof Error ? error.message : "Request form unavailable."));
    return () => { active = false; };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/public/leads/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        submissionId,
        contactName: String(form.get("contactName") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        serviceAddress: String(form.get("serviceAddress") ?? ""),
        message: String(form.get("message") ?? ""),
        website: String(form.get("website") ?? "")
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(payload?.error ?? "Unable to submit your request.");
    setSent(true);
  }

  if (loadError) return <section className="auth-card"><h1>Request form unavailable</h1><p className="auth-copy">{loadError}</p></section>;
  if (!context) return <section className="auth-card"><p className="auth-copy">Loading service request form…</p></section>;
  if (sent) return <section className="auth-card"><p className="panel-label">Request received</p><h1>Thank you.</h1><p className="auth-copy">Your request was added to {context.businessName}&apos;s Ziepher lead inbox. This form does not automatically send you text messages or enroll you in marketing.</p></section>;

  return (
    <section className="auth-card" style={{ maxWidth: 720 }}>
      <p className="panel-label">{context.businessName}</p>
      <h1 style={{ margin: "6px 0 8px" }}>Request tree service</h1>
      <p className="auth-copy" style={{ marginTop: 0 }}>
        Tell the company what you need and how to reach you.{context.serviceArea ? ` Service area: ${context.serviceArea}` : ""}
      </p>
      {context.emergencyService ? <p className="auth-copy"><strong>Emergency service is offered.</strong> For an immediate safety emergency, use the company&apos;s direct phone number when available.</p> : null}
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 18 }}>
        <label className="field"><span>Name</span><input name="contactName" required maxLength={160} autoComplete="name" /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <label className="field"><span>Phone</span><input name="phone" maxLength={40} autoComplete="tel" /></label>
          <label className="field"><span>Email</span><input name="email" type="email" maxLength={320} autoComplete="email" /></label>
        </div>
        <label className="field"><span>Service address</span><input name="serviceAddress" maxLength={500} autoComplete="street-address" /></label>
        <label className="field"><span>What tree work do you need?</span><textarea name="message" rows={6} maxLength={5000} placeholder="Tree removal, trimming, storm damage, stump grinding, hazard concern…" /></label>
        <label aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
        <p className="auth-copy" style={{ fontSize: 13, margin: 0 }}>Provide at least a phone number or email. Submitting this form creates a service request only; SMS consent is not assumed.</p>
        <div className="inline-actions"><button className="button primary" disabled={busy} type="submit">{busy ? "Submitting…" : "Submit request"}</button>{context.businessPhone ? <a className="button" href={`tel:${context.businessPhone}`}>Call {context.businessPhone}</a> : null}</div>
        {message ? <p className="form-error">{message}</p> : null}
      </form>
    </section>
  );
}
