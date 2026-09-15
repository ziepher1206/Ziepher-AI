"use client";

import { useEffect, useState } from "react";

const CONTRIBUTOR_PATH_KEY = "zlife.contributor.path.v1";

const guides: Record<string, { title: string; summary: string; firstSteps: string[] }> = {
  developer: {
    title: "Developer path",
    summary: "Build focused features, modules, fixes, integrations, and architecture improvements in isolated branches or forks.",
    firstSteps: ["Choose one scoped task", "Open the linked issue and repository", "Build with mock/dev resources", "Run the required checks", "Submit GitHub proof"],
  },
  designer: {
    title: "Designer / UX path",
    summary: "Improve how ZLife feels, flows, reads, and works on mobile without needing production access.",
    firstSteps: ["Choose a flow or screen", "Identify user friction", "Create a concrete redesign", "Explain accessibility/mobile impact", "Submit evidence or a focused PR"],
  },
  tester: {
    title: "Tester / QA path",
    summary: "Protect reliability by reproducing bugs, testing edge cases, and validating the real user workflow.",
    firstSteps: ["Choose an open validation task", "Start from a clean environment", "Record exact reproduction steps", "Capture safe screenshots/logs", "Submit the evidence"],
  },
  expert: {
    title: "Industry expert path",
    summary: "Teach ZLife how real businesses and households actually work so AI and builders design the right modules.",
    firstSteps: ["Pick a domain you know well", "Describe the real workflow", "Call out exceptions and failure cases", "Explain what existing software gets wrong", "Turn the knowledge into a proposal or test case"],
  },
  translator: {
    title: "Translator path",
    summary: "Help ZLife become understandable across languages and regions while preserving meaning and product behavior.",
    firstSteps: ["Choose a surface or module", "Translate meaning, not just words", "Flag culturally unclear wording", "Check mobile layout after translation", "Submit the changed copy or review"],
  },
  researcher: {
    title: "Researcher path",
    summary: "Gather evidence that helps ZLife decide what to build, simplify, remove, or redesign.",
    firstSteps: ["Choose one decision or problem", "Gather reliable evidence", "Separate facts from assumptions", "Summarize implications for ZLife", "Create an actionable proposal"],
  },
  automation: {
    title: "AI / Automation Builder path",
    summary: "Design agents, orchestration, evaluations, workflow automation, and safe AI-assisted operations.",
    firstSteps: ["Choose one repeatable workflow", "Define inputs, outputs, and approval gates", "Prefer existing ZLife Core primitives", "Add deterministic tests/evaluations", "Submit a reversible implementation"],
  },
  unsure: {
    title: "ZLife can help you choose",
    summary: "You do not need to know where you fit yet. Start with what you know, what you enjoy, or what problem you noticed.",
    firstSteps: ["Add your main skill or real-world experience below", "Browse the live value-work board", "Pick one problem you understand", "Start small", "Let review guide the next contribution"],
  },
};

export default function ContributorPathGuide() {
  const [path, setPath] = useState("unsure");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPath(window.localStorage.getItem(CONTRIBUTOR_PATH_KEY) ?? "unsure");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const guide = guides[path] ?? guides.unsure;

  return (
    <section className="zlife-studio-panel">
      <div className="zlife-studio-panel-head">
        <div>
          <p className="zlife-kicker">YOUR FASTEST START</p>
          <h2>{guide.title}</h2>
          <p>{guide.summary}</p>
        </div>
        <a className="zlife-secondary" href="/community/join">Change path</a>
      </div>
      <div className="zlife-community-flow" style={{ flexWrap: "wrap" }}>
        {guide.firstSteps.map((step, index) => (
          <span key={step}>{index + 1}. {step}</span>
        ))}
      </div>
      <p className="zlife-community-empty" style={{ marginTop: 12 }}>ZLife keeps production credentials, customer data, live billing, and deployment authority outside this contributor workflow.</p>
    </section>
  );
}
