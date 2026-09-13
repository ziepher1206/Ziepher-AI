"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const commonTimezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Puerto_Rico"
];

export function OperateTimezoneSetup({ workspaceId, timezone }: { workspaceId: string; timezone: string | null }) {
  const router = useRouter();
  const detected = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    } catch {
      return "America/New_York";
    }
  }, []);
  const initial = timezone ?? detected;
  const options = Array.from(new Set([initial, ...commonTimezones]));
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/operate/setup/crew-staffing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set_timezone", workspaceId, timezone: value })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save timezone.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <p className="panel-label">Scheduling timezone</p>
      <h2 style={{ margin: "6px 0 8px" }}>Business timezone</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>
        Crew working hours are interpreted in this timezone. Once saved, Ziepher will reject job times outside configured crew hours.
      </p>
      <form onSubmit={submit} style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginTop: 16 }}>
        <label className="field" style={{ flex: "1 1 280px" }}>
          <span>Timezone</span>
          <select value={value} onChange={(event) => setValue(event.target.value)}>
            {options.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <button className="button primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save timezone"}</button>
      </form>
      <p className="auth-copy" style={{ margin: "10px 0 0", fontSize: 13 }}>
        {timezone ? `Current: ${timezone}` : `Not saved yet. Detected from this device: ${detected}`}
      </p>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
