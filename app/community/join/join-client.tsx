"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ACCEPTANCE_KEY = "zlife.contributor-rules.accepted.v1";
const CONTRIBUTOR_PATH_KEY = "zlife.contributor.path.v1";

const contributorPaths = [
  ["developer", "Developer", "Build features, modules, architecture, integrations, and fixes."],
  ["designer", "Designer / UX", "Improve flows, mobile usability, accessibility, visual systems, and onboarding."],
  ["tester", "Tester / QA", "Reproduce bugs, verify workflows, stress edge cases, and protect reliability."],
  ["expert", "Industry Expert", "Teach ZLife how real work is done so AI and builders can create better modules."],
  ["translator", "Translator", "Help ZLife communicate clearly across languages and regions."],
  ["researcher", "Researcher", "Investigate user needs, competitors, standards, workflows, and evidence."],
  ["automation", "AI / Automation Builder", "Design agents, orchestration, workflows, evaluations, and automation."],
  ["unsure", "Help Me Choose", "Tell ZLife what you know and let the contributor guide point you toward useful work."],
] as const;

export function ContributorJoinClient() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [path, setPath] = useState<string>("unsure");

  function enterStudio() {
    if (!accepted) return;
    window.localStorage.setItem(ACCEPTANCE_KEY, new Date().toISOString());
    window.localStorage.setItem(CONTRIBUTOR_PATH_KEY, path);
    router.push("/community/studio/start");
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <section className="auth-card" style={{ maxWidth: "none" }}>
        <p className="panel-label">How do you want to help?</p>
        <h2 style={{ margin: "6px 0 12px" }}>Pick the path that sounds most like you.</h2>
        <p className="auth-copy">You can change this later. ZLife uses it only to make Studio easier to understand and surface the most relevant ways to contribute.</p>
        <div className="project-grid" style={{ marginTop: 16 }}>
          {contributorPaths.map(([id, title, description]) => (
            <button
              key={id}
              type="button"
              className="project-card"
              onClick={() => setPath(id)}
              aria-pressed={path === id}
              style={{ minHeight: 0, textAlign: "left", cursor: "pointer", outline: path === id ? "2px solid rgba(255,140,40,.9)" : undefined }}
            >
              <span className="status-pill">{path === id ? "Selected" : "Choose"}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="auth-card" style={{ maxWidth: "none" }}>
        <p className="panel-label">Contributor rules</p>
        <h2 style={{ margin: "6px 0 12px" }}>Build freely. Protect the platform.</h2>
        <div className="auth-copy" style={{ display: "grid", gap: 10 }}>
          <p>Use sandbox, fork, branch, mock-data, and development environments only unless Ziepher Tech explicitly grants a different level of access.</p>
          <p>Never submit production credentials, customer data, payment details, private keys, session tokens, or confidential information.</p>
          <p>All work must pass review, CI, security checks, and visual workflow testing before it can be considered for ZLife.</p>
          <p>Contribution value is based on verified impact, quality, adoption, reliability, and usefulness—not raw commits, hours, or popularity.</p>
          <p>Contributor status does not automatically create employment, partnership, equity, ownership, or a guaranteed payout. Any paid reward or revenue-share program must be explicitly active and governed by its published terms.</p>
        </div>
      </section>

      <section className="project-card" style={{ minHeight: 0 }}>
        <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            aria-label="Accept ZLife contributor rules"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            type="checkbox"
            style={{ width: 20, height: 20, marginTop: 2 }}
          />
          <span>
            <strong>I accept the ZLife contributor rules.</strong><br />
            <span className="auth-copy">I understand that public contribution happens inside controlled environments and that acceptance does not grant production access.</span>
          </span>
        </label>

        <div className="zlife-hero-actions" style={{ marginTop: 20 }}>
          <button className="zlife-primary" type="button" disabled={!accepted} onClick={enterStudio} style={{ opacity: accepted ? 1 : 0.45 }}>
            Accept & Show My Starting Path <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
