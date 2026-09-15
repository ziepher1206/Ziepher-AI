"use client";

import { useEffect, useMemo, useState } from "react";

const ACCEPT_KEY = "zlife.contributor-rules.accepted.v1";
const PROFILE_KEY = "zlife_contributor_profile";
const TASK_KEY = "zlife_contributor_active_task";

const tasks = [
  {
    id: "tree-onboarding-mobile",
    title: "Improve Tree Service mobile onboarding",
    area: "Tree Service",
    kind: "Design + Test",
    priority: "High",
    value: "Reduce setup friction for the first active business vertical.",
    github: "https://github.com/ziepher1206/Ziepher-AI/issues",
  },
  {
    id: "service-persistence",
    title: "Verify service setup persistence",
    area: "Tree Service",
    kind: "QA",
    priority: "High",
    value: "Make sure saved services survive refresh and returning-user flows.",
    github: "https://github.com/ziepher1206/Ziepher-AI/issues",
  },
  {
    id: "home-family-ux",
    title: "Test Home & Family empty states",
    area: "Home & Family",
    kind: "Test + UX",
    priority: "Medium",
    value: "Make the personal side understandable before a user has added any data.",
    github: "https://github.com/ziepher1206/Ziepher-AI/issues",
  },
  {
    id: "accessibility-pass",
    title: "Accessibility review of public onboarding",
    area: "ZLife Core",
    kind: "Accessibility",
    priority: "Medium",
    value: "Catch keyboard, contrast, labeling, and mobile usability problems early.",
    github: "https://github.com/ziepher1206/Ziepher-AI/issues",
  },
  {
    id: "industry-knowledge",
    title: "Submit a real-world industry workflow",
    area: "Community",
    kind: "Domain expertise",
    priority: "Open",
    value: "Teach ZLife how real work happens so AI can turn expertise into better software.",
    github: "https://github.com/ziepher1206/Ziepher-AI/issues/new?template=feature-proposal.md",
  },
] as const;

type Profile = {
  displayName: string;
  specialty: string;
};

function loadJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export default function StudioWorkspaceClient() {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [profile, setProfile] = useState<Profile>({ displayName: "", specialty: "" });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAccepted(Boolean(window.localStorage.getItem(ACCEPT_KEY)));
      setProfile(loadJson<Profile>(PROFILE_KEY) ?? { displayName: "", specialty: "" });
      setActiveTaskId(window.localStorage.getItem(TASK_KEY));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeTask = useMemo(() => tasks.find((task) => task.id === activeTaskId) ?? null, [activeTaskId]);

  function saveProfile(next: Profile) {
    setProfile(next);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }

  function chooseTask(id: string) {
    setActiveTaskId(id);
    window.localStorage.setItem(TASK_KEY, id);
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
          <h2>Create your public working profile.</h2>
          <p>This local profile is only for the current Studio foundation. GitHub/account identity linking will replace it when authenticated contributor onboarding is connected.</p>
        </div>
        <div className="zlife-studio-profile-grid">
          <label>
            Display name
            <input
              value={profile.displayName}
              onChange={(event) => saveProfile({ ...profile, displayName: event.target.value.slice(0, 80) })}
              placeholder="How should ZLife identify you?"
            />
          </label>
          <label>
            Main skill / specialty
            <input
              value={profile.specialty}
              onChange={(event) => saveProfile({ ...profile, specialty: event.target.value.slice(0, 120) })}
              placeholder="Developer, designer, tree pro, tester…"
            />
          </label>
        </div>
      </section>

      <section className="zlife-studio-panel">
        <div className="zlife-studio-panel-head">
          <div>
            <p className="zlife-kicker">OPEN VALUE WORK</p>
            <h2>Choose one useful problem.</h2>
            <p>Each assignment is isolated from production. Selection creates a local Studio assignment; implementation still happens through a fork/branch and PR review.</p>
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
                <small>{task.kind}</small>
                <button type="button" onClick={() => chooseTask(task.id)}>{selected ? "Assigned to you" : "Choose this task"}</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="zlife-studio-panel">
        <p className="zlife-kicker">YOUR SANDBOX</p>
        {activeTask ? (
          <>
            <h2>{activeTask.title}</h2>
            <div className="zlife-community-flow"><span>Assigned</span><b>→</b><span>Fork / Branch</span><b>→</b><span>Mock + Local Test</span><b>→</b><span>PR</span><b>→</b><span>CI + Visual E2E</span><b>→</b><span>Verified Value</span></div>
            <div className="zlife-hero-actions">
              <a className="zlife-primary" href={activeTask.github} target="_blank" rel="noreferrer">Open build source <span>→</span></a>
              <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI" target="_blank" rel="noreferrer">Open repository</a>
            </div>
            <p className="zlife-community-empty">Assignment does not grant production credentials, customer data, billing access, or paid API access. Value is only credited after reviewed work is accepted into the verified contribution ledger.</p>
          </>
        ) : (
          <p className="zlife-community-empty">Choose a task above to create your first Studio sandbox assignment.</p>
        )}
      </section>
    </div>
  );
}
