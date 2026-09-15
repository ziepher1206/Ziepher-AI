import { NextResponse } from "next/server";

const OFFICIAL_REPO = "ziepher1206/Ziepher-AI";
const PR_PATTERN = /^https:\/\/github\.com\/ziepher1206\/Ziepher-AI\/pull\/(\d+)\/?$/i;

type GithubPullRequest = {
  number: number;
  state: string;
  head?: { sha?: string };
};

type GithubDeployment = {
  id: number;
  environment?: string;
  statuses_url?: string;
};

type GithubDeploymentStatus = {
  state?: string;
  description?: string | null;
  environment_url?: string | null;
  created_at?: string;
};

type GithubCombinedStatus = {
  statuses?: Array<{
    context?: string;
    state?: string;
    description?: string | null;
    target_url?: string | null;
  }>;
};

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ZLife-Studio-Preview",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { pullRequestUrl?: unknown } | null;
  const pullRequestUrl = typeof body?.pullRequestUrl === "string" ? body.pullRequestUrl.trim() : "";
  const match = PR_PATTERN.exec(pullRequestUrl);
  if (!match) {
    return NextResponse.json(
      { error: `Use a pull request from the official ${OFFICIAL_REPO} repository.` },
      { status: 400 },
    );
  }

  const pullNumber = Number(match[1]);
  if (!Number.isSafeInteger(pullNumber) || pullNumber < 1) {
    return NextResponse.json({ error: "Invalid pull request number." }, { status: 400 });
  }

  try {
    const pull = await githubJson<GithubPullRequest>(
      `https://api.github.com/repos/${OFFICIAL_REPO}/pulls/${pullNumber}`,
    );
    const headSha = pull.head?.sha;
    if (!headSha) {
      return NextResponse.json({ error: "GitHub did not return a head commit for this pull request." }, { status: 502 });
    }

    const deployments = await githubJson<GithubDeployment[]>(
      `https://api.github.com/repos/${OFFICIAL_REPO}/deployments?sha=${encodeURIComponent(headSha)}&per_page=10`,
    ).catch(() => []);

    for (const deployment of deployments) {
      if (!deployment.statuses_url) continue;
      const statuses = await githubJson<GithubDeploymentStatus[]>(deployment.statuses_url).catch(() => []);
      const previewStatus = statuses
        .filter((status) => typeof status.environment_url === "string" && status.environment_url.startsWith("https://"))
        .sort((a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""))[0];

      if (previewStatus?.environment_url) {
        return NextResponse.json({
          pullNumber,
          pullState: pull.state,
          headSha,
          previewUrl: previewStatus.environment_url,
          previewState: previewStatus.state ?? "unknown",
          message: previewStatus.description ?? "Preview deployment found.",
        });
      }
    }

    const combined = await githubJson<GithubCombinedStatus>(
      `https://api.github.com/repos/${OFFICIAL_REPO}/commits/${encodeURIComponent(headSha)}/status`,
    ).catch(() => ({ statuses: [] }));
    const vercel = combined.statuses?.find((status) => status.context?.toLowerCase() === "vercel");

    return NextResponse.json({
      pullNumber,
      pullState: pull.state,
      headSha,
      previewUrl: null,
      previewState: vercel?.state ?? "waiting",
      inspectorUrl: vercel?.target_url ?? null,
      message: vercel?.description ?? "Preview is still being created. Pushes to this PR will refresh it automatically.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to find this build preview." },
      { status: 502 },
    );
  }
}
