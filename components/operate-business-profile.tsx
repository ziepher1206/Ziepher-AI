"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type InsuranceStatus = "insured" | "not_insured" | "not_provided";

type Profile = {
  business_name: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  service_area: string | null;
  about: string | null;
  owner_name: string | null;
  years_in_business: number | null;
  emergency_service: boolean;
  insurance_status?: InsuranceStatus | null;
  license_insurance_notes: string | null;
  review_url?: string | null;
} | null;

export function OperateBusinessProfile({ workspaceId, profile }: { workspaceId: string; profile: Profile }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(profile?.business_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url ?? "");
  const [reviewUrl, setReviewUrl] = useState(profile?.review_url ?? "");
  const [serviceArea, setServiceArea] = useState(profile?.service_area ?? "");
  const [about, setAbout] = useState(profile?.about ?? "");
  const [ownerName, setOwnerName] = useState(profile?.owner_name ?? "");
  const [years, setYears] = useState(profile?.years_in_business?.toString() ?? "");
  const [emergency, setEmergency] = useState(profile?.emergency_service ?? false);
  const [insuranceStatus, setInsuranceStatus] = useState<InsuranceStatus>(profile?.insurance_status ?? "not_provided");
  const [insuranceNotes, setInsuranceNotes] = useState(profile?.license_insurance_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/operate/setup/business-profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        businessName,
        phone,
        email,
        websiteUrl,
        reviewUrl,
        serviceArea,
        about,
        ownerName,
        yearsInBusiness: years ? Number(years) : null,
        emergencyService: emergency,
        insuranceStatus,
        licenseInsuranceNotes: insuranceNotes
      })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(payload?.error ?? "Unable to save business profile.");
    setMessage("Business profile saved.");
    router.refresh();
  }

  const insuranceLabel = insuranceStatus === "insured"
    ? "INSURED — self-reported"
    : insuranceStatus === "not_insured"
      ? "NOT INSURED"
      : "INSURANCE NOT PROVIDED";

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <p className="panel-label">Company profile</p>
      <h2 style={{ margin: "6px 0 8px" }}>Tree service business details</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>These details become the shared business context for operations, website content, recommendations, and future modules. Enter only facts you want Ziepher to reuse.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <label className="field"><span>Business name</span><input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={160} placeholder="Example Tree Service" /></label>
          <label className="field"><span>Owner / primary contact</span><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} maxLength={160} /></label>
          <label className="field"><span>Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={80} /></label>
          <label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} /></label>
          <label className="field"><span>Website</span><input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} maxLength={1000} placeholder="https://…" /></label>
          <label className="field"><span>Verified review link</span><input type="url" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} maxLength={1000} placeholder="Google review link or another verified review destination" /></label>
          <label className="field"><span>Years in business</span><input type="number" min={0} max={250} value={years} onChange={(e) => setYears(e.target.value)} /></label>
        </div>

        <label className="field"><span>Service area</span><textarea rows={3} value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} maxLength={2000} placeholder="Cities, counties, ZIP codes, or a plain-English service radius…" /></label>
        <label className="field"><span>About the company</span><textarea rows={4} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={6000} placeholder="What the company does, what makes it different, typical customers…" /></label>

        <div className="project-card" style={{ minHeight: 0, display: "grid", gap: 12 }}>
          <div>
            <p className="panel-label" style={{ marginBottom: 6 }}>Insurance status</p>
            <strong style={{ display: "block", fontSize: 18 }}>{insuranceLabel}</strong>
            <p className="auth-copy" style={{ margin: "6px 0 0" }}>Insurance is not required to use Ziepher. This status will be shown clearly to customers. “Insured” is self-reported unless Ziepher later verifies documentation.</p>
          </div>
          <label className="field">
            <span>Does this company currently carry business liability insurance?</span>
            <select value={insuranceStatus} onChange={(e) => setInsuranceStatus(e.target.value as InsuranceStatus)}>
              <option value="not_provided">Not provided yet</option>
              <option value="insured">Yes — insured</option>
              <option value="not_insured">No — not insured</option>
            </select>
          </label>
          <label className="field"><span>Optional insurance / license details</span><textarea rows={2} value={insuranceNotes} onChange={(e) => setInsuranceNotes(e.target.value)} maxLength={3000} placeholder="Optional: carrier, policy details, license number, or other verified credential notes." /></label>
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} /> <span>Offers emergency / after-hours tree service</span></label>
        <div className="inline-actions"><button className="button primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save company profile"}</button>{message ? <span className="auth-copy">{message}</span> : null}</div>
      </form>
    </section>
  );
}
