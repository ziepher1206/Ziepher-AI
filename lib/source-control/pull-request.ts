import "server-only";

import { parseRepositoryFullName } from "./lifecycle";

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";
const FULL_SHA = /^[a-f0-9]{40}$/i;

type GitHubPullRequest = {
  number: number;
  html_url: string;
  state?: string;
  head: { sha: string; ref: string };
  base: { ref: string };
};

class GitHubPullRequestApiError extends Error {
  constructor(
    readonly status: number,
    readonly requestId: string | null
  ) {
    super(
      `GitHub pull-request API request failed (${status})${requestId ? ` [${requestId}]` : ""}`
    );
    this.name = "GitHubPullRequestApiError";
  }
}

async function request<T>(
  accessToken: string,
  url: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {}
): Promise<T> {
  if (!accessToken.trim()) throw new Error("GitHub access token is required.");
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": API_VERSION,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new GitHubPullRequestApiError(
      response.status,
      response.headers.get("x-github-request-id")
    );
  }
  return response.json() as Promise<T>;
}

function normalizePullRequest(
  pullRequest: GitHubPullRequest,
  input: {
    workingBranch: string;
    baseBranch: string;
    expectedHeadSha: string;
  }
) {
  if (!Number.isInteger(pullRequest.number) || pullRequest.number < 1) {
    throw new Error("GitHub returned an invalid pull request number.");
  }
  if (!FULL_SHA.test(pullRequest.head?.sha ?? "")) {
    throw new Error("GitHub returned an invalid pull request head SHA.");
  }
  if (pullRequest.head.ref !== input.workingBranch) {
    throw new Error("GitHub pull request does not use Ziepher's working branch.");
  }
  if (pullRequest.base.ref !== input.baseBranch) {
    throw new Error("Ziepher working branch already has a pull request targeting an unexpected base branch.");
  }

  const headSha = pullRequest.head.sha.toLowerCase();
  if (headSha !== input.expectedHeadSha.toLowerCase()) {
    throw new Error("GitHub pull request head changed unexpectedly. Refusing to continue.");
  }

  return {
    number: pullRequest.number,
    url: pullRequest.html_url,
    headSha
  };
}

async function findOpenPullRequest(
  accessToken: string,
  repositoryFullName: string,
  input: {
    workingBranch: string;
    baseBranch: string;
    expectedHeadSha: string;
  }
) {
  const { owner, repo } = parseRepositoryFullName(repositoryFullName);
  const query = new URLSearchParams({
    state: "open",
    head: `${owner}:${input.workingBranch}`,
    per_page: "100"
  });
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${query}`;
  const pullRequests = await request<GitHubPullRequest[]>(accessToken, url);

  const matchingHead = pullRequests.filter(
    (pullRequest) => pullRequest.head?.ref === input.workingBranch
  );
  if (matchingHead.length > 1) {
    throw new Error("Multiple open pull requests exist for Ziepher's working branch. Refusing to guess.");
  }
  if (matchingHead.length === 0) return null;
  return normalizePullRequest(matchingHead[0]!, input);
}

export async function ensureGitHubPullRequest(
  accessToken: string,
  repositoryFullName: string,
  input: {
    workingBranch: string;
    baseBranch: string;
    expectedHeadSha: string;
    runId: string;
    buildJobId: string;
  }
) {
  if (!FULL_SHA.test(input.expectedHeadSha)) {
    throw new Error("A full expected pull request head SHA is required.");
  }

  const existing = await findOpenPullRequest(
    accessToken,
    repositoryFullName,
    input
  );
  if (existing) return { ...existing, created: false };

  const { owner, repo } = parseRepositoryFullName(repositoryFullName);
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
  const title = `Ziepher build ${input.buildJobId}`;
  const body = [
    "Generated and validated by Ziepher.",
    "",
    `Ziepher-Source-Control-Run: ${input.runId}`,
    `Ziepher-Head-SHA: ${input.expectedHeadSha.toLowerCase()}`
  ].join("\n");

  try {
    const created = await request<GitHubPullRequest>(accessToken, url, {
      method: "POST",
      body: {
        head: input.workingBranch,
        base: input.baseBranch,
        title,
        body,
        draft: false
      }
    });
    return {
      ...normalizePullRequest(created, input),
      created: true
    };
  } catch (error) {
    const reconciled = await findOpenPullRequest(
      accessToken,
      repositoryFullName,
      input
    );
    if (reconciled) return { ...reconciled, created: false };
    throw error;
  }
}

export async function verifyGitHubPullRequest(
  accessToken: string,
  repositoryFullName: string,
  input: {
    pullRequestNumber: number;
    workingBranch: string;
    baseBranch: string;
    expectedHeadSha: string;
  }
) {
  if (!Number.isInteger(input.pullRequestNumber) || input.pullRequestNumber < 1) {
    throw new Error("A valid pull request number is required.");
  }
  if (!FULL_SHA.test(input.expectedHeadSha)) {
    throw new Error("A full expected pull request head SHA is required.");
  }

  const { owner, repo } = parseRepositoryFullName(repositoryFullName);
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${input.pullRequestNumber}`;
  const pullRequest = await request<GitHubPullRequest>(accessToken, url);
  if (pullRequest.state !== "open") {
    throw new Error("GitHub pull request is no longer open.");
  }
  const normalized = normalizePullRequest(pullRequest, input);
  if (normalized.number !== input.pullRequestNumber) {
    throw new Error("GitHub returned a different pull request than requested.");
  }
  return normalized;
}
