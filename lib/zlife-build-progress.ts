export type BuildMilestone = {
  id: string;
  label: string;
  complete: boolean;
};

export type BuildProgress = {
  key: string;
  label: string;
  status: "planned" | "building" | "testing" | "review" | "ready";
  owner: "Ziepher Tech" | "Community" | "Shared";
  milestones: BuildMilestone[];
  next: string;
};

export const buildProgress: Record<string, BuildProgress> = {
  "ai-teams": {
    key: "ai-teams",
    label: "AI Teams",
    status: "building",
    owner: "Ziepher Tech",
    milestones: [
      { id: "structure", label: "Team structure defined", complete: true },
      { id: "public-view", label: "Public AI Teams page", complete: true },
      { id: "routing", label: "Operational task routing", complete: false },
      { id: "evaluation", label: "Agent performance evaluation", complete: false },
      { id: "governance", label: "Production governance controls", complete: false },
    ],
    next: "Connect operational task routing and measured agent evaluation.",
  },
  modules: {
    key: "modules",
    label: "Modules",
    status: "building",
    owner: "Shared",
    milestones: [
      { id: "catalog", label: "Module catalog foundation", complete: true },
      { id: "tree", label: "Tree Service foundation", complete: true },
      { id: "home", label: "Home & Family foundation", complete: true },
      { id: "install", label: "User-selected installed modules", complete: true },
      { id: "contract", label: "Reusable module contract / SDK", complete: false },
      { id: "generator", label: "AI-assisted module generator", complete: false },
      { id: "cross-module", label: "Cross-module orchestration", complete: false },
    ],
    next: "Standardize the module contract and cross-module orchestration layer.",
  },
  about: {
    key: "about",
    label: "About ZLife",
    status: "ready",
    owner: "Ziepher Tech",
    milestones: [
      { id: "mission", label: "Mission and problem defined", complete: true },
      { id: "founder", label: "Founder story documented", complete: true },
      { id: "public", label: "Public page available", complete: true },
    ],
    next: "Keep the story synchronized with product changes.",
  },
  vision: {
    key: "vision",
    label: "Future Plan",
    status: "review",
    owner: "Ziepher Tech",
    milestones: [
      { id: "roadmap", label: "Public roadmap foundation", complete: true },
      { id: "continuous-os", label: "Continuous ZLife OS doctrine", complete: true },
      { id: "community", label: "Community-building model", complete: true },
      { id: "progress", label: "Live build progress model", complete: true },
      { id: "public-release", label: "Public-access readiness review", complete: false },
    ],
    next: "Complete the public-access readiness review.",
  },
  community: {
    key: "community",
    label: "Community",
    status: "building",
    owner: "Shared",
    milestones: [
      { id: "entry", label: "Public contributor entry", complete: true },
      { id: "studio", label: "Safe contributor Studio", complete: true },
      { id: "claims", label: "Task claims", complete: true },
      { id: "evidence", label: "Contribution evidence", complete: true },
      { id: "review", label: "Review and re-review workflow", complete: true },
      { id: "preview", label: "One-click live build preview", complete: false },
      { id: "briefs", label: "Detailed contributor task briefs", complete: true },
      { id: "repo-guard", label: "Repository production protections", complete: false },
    ],
    next: "Finish live preview and repository safeguards before broader contributor access.",
  },
};

export function completionPercent(progress: BuildProgress) {
  if (progress.milestones.length === 0) return 0;
  const complete = progress.milestones.filter((milestone) => milestone.complete).length;
  return Math.round((complete / progress.milestones.length) * 100);
}
