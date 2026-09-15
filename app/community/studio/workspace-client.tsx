"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudioTask } from "@/lib/community/studio-tasks";

const ACCEPT_KEY = "zlife.contributor-rules.accepted.v1";
const PROFILE_KEY = "zlife_contributor_profile";
const TASK_KEY = "zlife_contributor_active_task";

type Profile = {
  displayName: string;
  specialty: string;
};

type HistoryItem = {
  id: string;
  title: string;
  state: string;
  issueNumber: number | null;
  updatedAt: string;
};

type ContributorIdentity = {
  authenticated: true;
  email: string | null;
  displayName: string;
  status: string;
  verified: boolean;
  activeTaskId: string | null;
  activeTaskState: string;
  history: HistoryItem[];
};

function loadJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function labelState(state: string) {
  return state.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function StudioWorkspaceClient({ tasks, identity }: { tasks: StudioTask[]; identity: ContributorIdentity | null }) {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [profile, setProfile] = useState<Profile>({ displayName: identity?.displayName ?? "", specialty: "" });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(identity?.activeTaskId ?? null);
  const [activeTaskState, setActiveTaskState] = useState(identity?.activeTaskState ?? "claimed");
  const [history, setHistory] = useState<HistoryItem[]>(identity?.history ?? []);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [claimState, setClaimState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAccepted(Boolean(window.localStorage.getItem(ACCEPT_KEY)));
      const local = loadJson<Profile>(PROFILE_KEY);
      setProfile({
        displayName: identity?.displayName || local?.displayName || "",
        specialty: local?.specialty || "",
      });
      const localTaskId = window.localStorage.getItem(TASK_KEY);
      setActiveTaskId(identity?.activeTaskId || localTaskId);
      setActiveTaskState(identity?.activeTaskState ?? "claimed");
      setHistory(identity?.history ?? []);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [identity?.activeTaskId, identity?.activeTaskState, identity?.displayName, identity?.history]);

  const activeTask = useMemo(() => tasks.find((task) => task.id === activeTaskId) ?? null, [activeTaskId, tasks]);

  function saveLocalProfile(next: Profile) {
    setProfile(next);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setSyncState("idle");
  }

  async function syncIdentity() {
    if (!identity || !profile.displayName.trim()) return;
    setSyncState("saving");
    try {
      const response = await fetch("/api/community/contributor-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: profile.displayName }),
      });
      setSyncState(response.ok ? "saved" : "error");
    } catch {
      setSyncState("error");
    }
  }

  async function chooseTask(id: string) {
    setActiveTaskId(id);
    setActiveTaskState("claimed");
    setEvidenceUrl("");
    setSubmitMessage("");
    window.localStorage.setItem(TASK_KEY, id);
    setClaimState("idle");
    setSubmitState("idle");
    if (!identity) return;

    setClaimState("saving");
    try {
      const response = await fetch("/api/community/task-claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: id }),
      });
      if (!response.ok) {
        setClaimState("error");
        return;
      }
      const task = tasks.find((item) => item.id === id);
      if (task) {
        setHistory((current) => [
          {
            id: `active-${id}`,
            title: task.title,
            state: "claimed",
            issueNumber: task.issueNumber,
            updatedAt: new Date().toISOString(),
          },
          ...current.filter((item) => item.title !== task.title),
        ].slice(0, 8));
      }
      setClaimState("saved");
    } catch {
      setClaimState("error");
    }
  }

  async function submitActiveTask() {
    if (!identity || !activeTask || !evidenceUrl.trim()) return;
    setSubmitState("saving");
    setSubmitMessage("");
    try {
      const response = await fetch("/api/community/task-submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evidenceUrl }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; evidence?: { kind?: string; number?: number; state?: string } } | null;
      if (!response.ok) {
        setSubmitMessage(payload?.error ?? "ZLife could not verify that GitHub evidence.");
        setSubmitState("error");
        return;
      }
      setActiveTaskState("submitted");
      setHistory((current) => current.map((item, index) => index === 0 || item.title === activeTask.title
        ? { ...item, state: "submitted", updatedAt: new Date().toISOString() }
        : item));
      const evidenceLabel = payload?.evidence?.kind === "pull_request" ? "PR" : "issue";
      setSubmitMessage(`Verified ${evidenceLabel} #${payload?.evidence?.number ?? ""} and attached it to this submission.`);
      setSubmitState("saved");
    } catch {
      setSubmitMessage("ZLife could not verify that GitHub evidence.");
      setSubmitState("error");
    }
  }

  if (!ready) return <p className="zlife-community-empty">Loading Studio workspace…</p>;

  if (!accepted) {
    return (
      <article className="zlife-studio-lock">
        <p className="zlife-kicker">CONTRIBUTOR ACCESS REQUIRED</p>
        <h2>Accept the contributor rules first.</h2>
        <p>ZLife Studio stays isolated from production. Accept the public contributor rules before selecting work or creating a sandbox assignment.</p>
        <a className="zlife-primary" href="/community/join">Review and accept rules <span>→</span></a>
      </article>
    );
  }

  return (
    <div className="zlife-studio-workspace">
      <section className="zlife-studio-panel">
        <div>
          <p className="zlife-kicker">YOUR CONTRIBUTOR IDENTITY</p>
          <h2>{identity ? "Your ZLife identity is connected." : "Create your working profile."}</h2>
          <p>{identity ? `Signed in${identity.email ? ` as ${identity.email}` : ""}. Your display name can be synced into the protected ZLife contribution ledger.` : "You can begin as a guest immediately. Sign in when you want ZLife to persist your contributor identity across devices and connect verified contribution history."}</p>
        </div>
        <div className="zlife-studio-profile-grid">
          <label>
            Display name
            <input
              value={profile.displayName}
              onChange={(event) => saveLocalProfile({ ...profile, displayName: event.target.value.slice(0, 80) })}
              placeholder="How should ZLife identify you?"
            />
          </label>
          <label>
            Main skill / specialty
            <input
              value={profile.specialty}
              onChange={(event) => saveLocalProfile({ ...profile, specialty: event.target.value.slice(0, 120) })}
              placeholder="Developer, designer, tree pro, tester…"
            />
          </label>
        </div>
        <div className="zlife-hero-actions" style={{ marginTop: 16 }}>
          {identity ? (
            <button className="zlife-secondary" type="button" onClick={syncIdentity} disabled={syncState === "saving" || !profile.displayName.trim()}>
              {syncState === "saving" ? "Saving…" : syncState === "saved" ? "Identity saved" : "Save identity to ZLife"}
            </button>
          ) : (
            <a className="zlife-secondary" href="/auth/sign-in">Sign in to sync identity</a>
          )}
          {identity && <span className="zlife-community-empty">Status: {identity.status.replaceAll("_", " ")}{identity.verified ? " · verified" : " · not yet verified"}</span>}
          {syncState === "error" && <span className="zlife-community-empty">Identity sync failed. Your local Studio profile is still saved.</span>}
        </div>
      </section>

      <section className="zlife-studio-panel">
        <div className="zlife-studio-panel-head">
          <div>
            <p className="zlife-kicker">LIVE VALUE WORK</p>
            <h2>Choose one useful problem.</h2>
            <p>{identity ? "Choose a task and ZLife will persist the claim to your contributor history so it follows you across devices." : "This board is sourced from open public ZLife GitHub work. Guest assignments stay local until you sign in."}</p>
          </div>
          <span className="zlife-studio-sandbox-badge">Sandbox only</span>
        </div>

        <div className="zlife-studio-task-grid">
          {tasks.map((task) => {
            const selected = task.id === activeTaskId;
            return (
              <article className={selected ? "zlife-studio-task is-selected" : "zlife-studio-task"} key={task.id}>
                <div className="zlife-studio-task-meta"><span>{task.area}</span><span>{task.priority}</span></div>
                <h3>{task.title}</h3>
                <p>{task.value}</p>
                <small>Issue #{task.issueNumber} · {task.kind}</small>
                <button type="button" onClick={() => void chooseTask(task.id)} disabled={selected && claimState === "saving"}>
                  {selected ? claimState === "saving" ? "Saving claim…" : "Assigned to you" : "Choose this task"}
                </button>
              </article>
            );
          })}
        </div>
        {identity && activeTask && claimState === "saved" && <p className="zlife-community-empty">Task claim saved to your ZLife contributor history.</p>}
        {identity && claimState === "error" && <p className="zlife-community-empty">ZLife could not sync this claim. The local assignment is still saved on this device.</p>}
      </section>

      <section className="zlife-studio-panel">
        <p className="zlife-kicker">YOUR SANDBOX</p>
        {activeTask ? (
          <>
            <h2>{activeTask.title}</h2>
            <p className="zlife-community-empty">Current status: <strong>{labelState(activeTaskState)}</strong></p>
            <div className="zlife-community-flow"><span>Claimed</span><b>→</b><span>Submitted</span><b>→</b><span>Under Review</span><b>→</b><span>Verified / Rejected</span></div>
            <div className="zlife-hero-actions">
              <a className="zlife-primary" href={activeTask.github} target="_blank" rel="noreferrer">Open issue #{activeTask.issueNumber} <span>→</span></a>
              <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI" target="_blank" rel="noreferrer">Open repository</a>
            </div>
            {identity && activeTaskState === "claimed" && (
              <div className="zlife-studio-profile-grid" style={{ marginTop: 16 }}>
                <label>
                  GitHub proof link
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(event) => {
                      setEvidenceUrl(event.target.value.slice(0, 300));
                      setSubmitState("idle");
                      setSubmitMessage("");
                    }}
                    placeholder="https://github.com/ziepher1206/Ziepher-AI/pull/123"
                  />
                  <small>Paste the real Ziepher-AI pull request or issue that shows what you delivered.</small>
                </label>
                <div className="zlife-hero-actions" style={{ alignItems: "end" }}>
                  <button className="zlife-secondary" type="button" onClick={() => void submitActiveTask()} disabled={submitState === "saving" || !evidenceUrl.trim()}>
                    {submitState === "saving" ? "Verifying proof…" : "Verify proof & submit"}
                  </button>
                </div>
              </div>
            )}
            {submitState === "saved" && <p className="zlife-community-empty">{submitMessage} Submission recorded, but it still has zero value until review verifies the work.</p>}
            {submitState === "error" && <p className="zlife-community-empty">{submitMessage} Your existing task claim was not changed.</p>}
            <p className="zlife-community-empty">A task claim or submission is not value credit. ZLife checks the GitHub evidence first, then review decides whether the work is actually useful and eligible for verified value. Assignment does not grant production credentials, customer data, billing access, or paid API access.</p>
          </>
        ) : (
          <p className="zlife-community-empty">Choose a task above to create your first Studio sandbox assignment.</p>
        )}
      </section>

      {identity && (
        <section className="zlife-studio-panel">
          <div>
            <p className="zlife-kicker">YOUR CONTRIBUTION HISTORY</p>
            <h2>See what happened to your work.</h2>
            <p>This is your audit trail. It shows recent ZLife contribution records and their current review state; only verified work can later receive verified value.</p>
          </div>
          {history.length ? (
            <div className="zlife-studio-task-grid">
              {history.map((item) => (
                <article className="zlife-studio-task" key={item.id}>
                  <div className="zlife-studio-task-meta">
                    <span>{item.issueNumber ? `Issue #${item.issueNumber}` : "Contribution"}</span>
                    <span>{labelState(item.state)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <small>Updated {new Date(item.updatedAt).toLocaleDateString()}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="zlife-community-empty">Your contribution history will appear here after you claim or submit work.</p>
          )}
        </section>
      )}
    </div>
  );
}
