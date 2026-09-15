export type StudioTask = {
  id: string;
  issueNumber: number;
  title: string;
  area: string;
  kind: string;
  priority: string;
  value: string;
  github: string;
};

type GitHubIssue = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  pull_request?: unknown;
};

const fallbackTasks: StudioTask[] = [
  {
    id: "issue-166",
    issueNumber: 166,
    title: "[Public Help Wanted] Validate ZLife contributor setup from a clean fork",
    area: "Community",
    kind: "QA + Documentation",
    priority: "High",
    value: "Prove a new contributor can build and test ZLife without production credentials or paid provider usage.",
    github: "https://github.com/ziepher1206/Ziepher-AI/issues/166",
  },
  {
    id: "issue-167",
    issueNumber: 167,
    title: "[Public Help Wanted] Review the Tree Service workflow for real-world gaps",
    area: "Tree Service",
    kind: "Domain expertise",
    priority: "High",
    value: "Use real tree-service knowledge to find launch-critical workflow gaps before controlled pilot use.",
    github: "https://github.com/ziepher1206/Ziepher-AI/issues/167",
  },
  {
    id: "issue-138",
    issueNumber: 138,
    title: "[Good First Issue] Add contributor setup troubleshooting guide",
    area: "Community",
    kind: "Documentation",
    priority: "Beginner",
    value: "Make the zero-cost contributor setup easier for someone cloning ZLife for the first time.",
    github: "https://github.com/ziepher1206/Ziepher-AI/issues/138",
  },
  {
    id: "issue-139",
    issueNumber: 139,
    title: "[Beginner] Add public contributor-page link and accessibility regression tests",
    area: "Community",
    kind: "Testing + Accessibility",
    priority: "Beginner",
    value: "Protect the public contributor entry point with deterministic accessibility and navigation regression coverage.",
    github: "https://github.com/ziepher1206/Ziepher-AI/issues/139",
  },
];

function classify(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("tree service")) return { area: "Tree Service", kind: "Domain expertise", priority: "High" };
  if (lower.includes("accessibility")) return { area: "Community", kind: "Testing + Accessibility", priority: "Beginner" };
  if (lower.includes("troubleshooting")) return { area: "Community", kind: "Documentation", priority: "Beginner" };
  if (lower.includes("clean fork")) return { area: "Community", kind: "QA + Documentation", priority: "High" };
  return { area: "ZLife Core", kind: "Build + Test", priority: "Open" };
}

function summarize(body: string | null) {
  if (!body) return "Help complete a real open ZLife task and move it through review, CI, and verified contribution credit.";
  const plain = body
    .replace(/[`#>*_[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 180 ? `${plain.slice(0, 177)}…` : plain;
}

export async function getStudioTasks(): Promise<StudioTask[]> {
  try {
    const response = await fetch("https://api.github.com/repos/ziepher1206/Ziepher-AI/issues?state=open&per_page=40&sort=updated&direction=desc", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    });
    if (!response.ok) return fallbackTasks;

    const issues = (await response.json()) as GitHubIssue[];
    const publicWork = issues
      .filter((issue) => !issue.pull_request)
      .filter((issue) => /public help wanted|good first issue|beginner/i.test(issue.title))
      .slice(0, 8)
      .map((issue) => {
        const classification = classify(issue.title);
        return {
          id: `issue-${issue.number}`,
          issueNumber: issue.number,
          title: issue.title,
          area: classification.area,
          kind: classification.kind,
          priority: classification.priority,
          value: summarize(issue.body),
          github: issue.html_url,
        } satisfies StudioTask;
      });

    return publicWork.length ? publicWork : fallbackTasks;
  } catch {
    return fallbackTasks;
  }
}
