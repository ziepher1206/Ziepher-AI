import "server-only";

import { parseRepositoryFullName, type SourceControlStage } from "@/lib/source-control/lifecycle";

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

type GitHubRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
};

async function githubRequest<T>(
  accessToken: string,
  path: string,
  options: GitHubRequestOptions = {}
): Promise<T> {
  if (!accessToken.trim()) throw new Error("GitHub access token is required.");
  const response = await fetch(`${GITHUB_API}${path}`, {
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
    const requestId = response.headers.get("x-github-request-id");
    throw new Error(
      `GitHub API request failed (${response.status})${requestId ? ` [${requestId}]` : ""}`
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function repoPath(repositoryFullName: string) {
  const { owner, repo } = parseRepositoryFullName(repositoryFullName);
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export async function getGitHubRefSha(
  accessToken: string,
  repositoryFullName: string,
  branch: string
) {
  const base = repoPath(repositoryFullName);
  const ref = encodeURIComponent(`heads/${branch}`);
  const result = await githubRequest<{ object: { sha: string } }>(
    accessToken,
    `${base}/git/ref/${ref}`
  );
  if (!/^[a-f0-9]{40}$/i.test(result.object.sha)) {
    throw new Error("GitHub returned an invalid branch SHA.");
  }
  return result.object.sha;
}

export async function createGitHubBranch(
  accessToken: string,
  repositoryFullName: string,
  branch: string,
  baseSha: string
) {
  if (!/^[a-f0-9]{40}$/i.test(baseSha)) throw new Error("A full base commit SHA is required.");
  const base = repoPath(repositoryFullName);
  await githubRequest(accessToken, `${base}/git/refs`, {
    method: "POST",
    body: { ref: `refs/heads/${branch}`, sha: baseSha }
  });
}

export async function putGitHubFile(
  accessToken: string,
  repositoryFullName: string,
  branch: string,
  path: string,
  content: string,
  message: string,
  existingBlobSha?: string
) {
  const cleanPath = path.replace(/^\/+/, "");
  if (!cleanPath || cleanPath.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Unsafe repository file path.");
  }
  const base = repoPath(repositoryFullName);
  const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");
  const result = await githubRequest<{ commit: { sha: string }; content?: { sha?: string } }>(
    accessToken,
    `${base}/contents/${encodedPath}`,
    {
      method: "PUT",
      body: {
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        ...(existingBlobSha ? { sha: existingBlobSha } : {})
      }
    }
  );
  if (!result.commit?.sha) throw new Error("GitHub did not return a commit SHA.");
  return { commitSha: result.commit.sha, blobSha: result.content?.sha ?? null };
}

export async function openGitHubPullRequest(
  accessToken: string,
  repositoryFullName: string,
  input: { head: string; base: string; title: string; body?: string }
) {
  const base = repoPath(repositoryFullName);
  const result = await githubRequest<{ number: number; html_url: string; head: { sha: string } }>(
    accessToken,
    `${base}/pulls`,
    {
      method: "POST",
      body: {
        head: input.head,
        base: input.base,
        title: input.title,
        body: input.body ?? "",
        draft: false
      }
    }
  );
  if (!Number.isInteger(result.number) || result.number < 1) {
    throw new Error("GitHub returned an invalid pull request number.");
  }
  return { number: result.number, url: result.html_url, headSha: result.head.sha };
}

export async function getGitHubCheckSummary(
  accessToken: string,
  repositoryFullName: string,
  headSha: string
) {
  if (!/^[a-f0-9]{40}$/i.test(headSha)) throw new Error("A full head commit SHA is required.");
  const base = repoPath(repositoryFullName);
  const result = await githubRequest<{
    check_runs: Array<{ status: string; conclusion: string | null; name: string }>;
  }>(accessToken, `${base}/commits/${headSha}/check-runs?per_page=100`);

  const runs = result.check_runs ?? [];
  const pending = runs.filter((run) => run.status !== "completed");
  const failed = runs.filter(
    (run) =>
      run.status === "completed" &&
      !["success", "neutral", "skipped"].includes(run.conclusion ?? "")
  );
  return {
    total: runs.length,
    pending: pending.length,
    failed: failed.length,
    passed: runs.length > 0 && pending.length === 0 && failed.length === 0
  };
}

export async function mergeApprovedGitHubPullRequest(
  accessToken: string,
  repositoryFullName: string,
  input: {
    pullRequestNumber: number;
    expectedHeadSha: string;
    stage: SourceControlStage;
  }
) {
  if (input.stage !== "approved") {
    throw new Error("GitHub merge requires an approved source-control run.");
  }
  if (!/^[a-f0-9]{40}$/i.test(input.expectedHeadSha)) {
    throw new Error("A full expected head SHA is required.");
  }

  const base = repoPath(repositoryFullName);
  const result = await githubRequest<{ sha: string; merged: boolean; message: string }>(
    accessToken,
    `${base}/pulls/${input.pullRequestNumber}/merge`,
    {
      method: "PUT",
      body: {
        sha: input.expectedHeadSha,
        merge_method: "squash"
      }
    }
  );

  if (!result.merged || !result.sha) {
    throw new Error("GitHub did not merge the approved pull request.");
  }
  return { mergeSha: result.sha, message: result.message };
}
