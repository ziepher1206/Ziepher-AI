"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Crew = { id: string; name: string };
type Member = { user_id: string; role: string };

type Props = {
  jobId: string;
  crews: Crew[];
  members: Member[];
  defaultStartsAt?: string | null;
  defaultDurationMinutes?: number;
};

export function OperateJobScheduler({
  jobId,
  crews,
  members,
  defaultStartsAt,
  defaultDurationMinutes = 180
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const startsLocal = String(form.get("startsAt") ?? "");
    const crewId = String(form.get("crewId") ?? "");
    const assignedUserId = String(form.get("assignedUserId") ?? "");
    const durationMinutes = Number(form.get("durationMinutes") ?? defaultDurationMinutes);
    const startsAt = new Date(startsLocal);

    if (Number.isNaN(startsAt.getTime())) {
      setError("Choose a valid date and time.");
      setBusy(false);
      return;
    }

    const response = await fetch(`/api/operate/jobs/${jobId}/schedule`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        startsAt: startsAt.toISOString(),
        durationMinutes,
        crewId: crewId || null,
        assignedUserId: assignedUserId || null
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error ?? "Unable to schedule job.");
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh();
  }

  function localInputValue(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  return (
    <form onSubmit={submit} className="auth-card" style={{ maxWidth: "none", marginTop: 20 }}>
      <p className="panel-label">Schedule job</p>
      <h2 style={{ margin: "6px 0 8px" }}>Assign the work</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>
        Ziepher checks active user and crew appointments for overlaps before saving.
      </p>
      {!crews.length ? (
        <p className="auth-copy" style={{ margin: "0 0 14px" }}>
          No crews are configured yet. <Link href="/operate/setup">Add a crew in Business setup</Link>, or schedule this job without a crew for now.
        </p>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
        <label className="field">
          <span>Start date & time</span>
          <input name="startsAt" type="datetime-local" required defaultValue={localInputValue(defaultStartsAt)} />
        </label>
        <label className="field">
          <span>Estimated duration</span>
          <select name="durationMinutes" defaultValue={String(defaultDurationMinutes)}>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
            <option value="180">3 hours</option>
            <option value="240">4 hours</option>
            <option value="360">6 hours</option>
            <option value="480">8 hours</option>
          </select>
        </label>
        <label className="field">
          <span>Crew</span>
          <select name="crewId" defaultValue="">
            <option value="">No crew assigned</option>
            {crews.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Owner / responsible member</span>
          <select name="assignedUserId" defaultValue="">
            <option value="">Current/default owner</option>
            {members.map((member) => <option key={member.user_id} value={member.user_id}>{member.role} · {member.user_id.slice(0, 8)}</option>)}
          </select>
        </label>
      </div>
      <div className="inline-actions" style={{ marginTop: 16 }}>
        <button className="button primary" disabled={busy} type="submit">{busy ? "Scheduling…" : "Schedule job"}</button>
      </div>
      {error ? <p style={{ marginTop: 12, color: "#ffb199" }}>{error}</p> : null}
    </form>
  );
}
