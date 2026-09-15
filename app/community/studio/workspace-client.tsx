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

type ContributorIdentity = {
  authenticated: true;
  email: string | null;
  displayName: string;
  status: string;
  verified: boolean;
  activeTaskId: string | null;
};

function loadJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export default function StudioWorkspaceClient({ tasks, identity }: { tasks: StudioTask[]; identity: ContributorIdentity | null }) {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [profile, setProfile] = useState<Profile>({ displayName: identity?.displayName ?? "", specialty: "" });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(identity?.activeTaskId ?? null);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [claimState, setClaimState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [identity?.activeTaskId, identity?.displayName]);

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
    window.localStorage.setItem(TASK_KEY, id);
    setClaimState("idle");
    if (!identity) return;

    setClaimState("saving");
    try {
      const response = await fetch("/api/community/task-claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: id }),
      });
      setClaimState(response.ok ? "saved" : "error");
    } catch {
      setClaimState("error");
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
            <div className="zlife-community-flow"><span>Assigned</span><b>→</b><span>Fork / Branch</span><b>→</b><span>Mock + Local Test</span><b>→</b><span>PR</span><b>→</b><span>CI + Visual E2E</span><b>→</b><span>Verified Value</span></div>
            <div className="zlife-hero-actions">
              <a className="zlife-primary" href={activeTask.github} target="_blank" rel="noreferrer">Open issue #{activeTask.issueNumber} <span>→</span></a>
              <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI" target="_blank" rel="noreferrer">Open repository</a>
            </div>
            <p className="zlife-community-empty">A task claim is not value credit. It stays pending with zero score until useful work is reviewed and accepted. Assignment does not grant production credentials, customer data, billing access, or paid API access.</p>
          </>
        ) : (
          <p className="zlife-community-empty">Choose a task above to create your first Studio sandbox assignment.</p>
        )}
      </section>
    </div>
  );
}
