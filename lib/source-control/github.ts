import "server-only";

import { parseRepositoryFullName, type SourceControlStage } from "./lifecycle";

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";
const MAX_COMMIT_FILES = 300;
const MAX_COMMIT_BYTES = 8_000_000;

type GitHubRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
};

export class GitHubRequestError extends Error {
  readonly status: number;
  readonly requestId: string | null;

  constructor(status: number, requestId: string | null) {
    super(
      `GitHub API request failed (${status})${requestId ? ` [${requestId}]` : ""}`
    );
    this.name = "GitHubRequestError";
    this.status = status;
    this.requestId = requestId;
  }
}

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
    throw new GitHubRequestError(
      response.status,
      response.headers.get("x-github-request-id")
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function repoPath(repositoryFullName: string) {
  const { owner, repo } = parseRepositoryFullName(repositoryFullName);
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

function encodedRepositoryPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function assertSafeRepositoryFilePath(path: string) {
  const cleanPath = path.replace(/^\/+/, "");
  if (
    !cleanPath ||
    cleanPath.length > 240 ||
    cleanPath.includes("\\") ||
    cleanPath.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Unsafe repository file path.");
  }
  return cleanPath;
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

export async function getGitHubRefShaIfExists(
  accessToken: string,
  repositoryFullName: string,
  branch: string
) {
  try {
    return await getGitHubRefSha(accessToken, repositoryFullName, branch);
  } catch (error) {
    if (error instanceof GitHubRequestError && error.status === 404) return null;
    throw error;
  }
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
  const cleanPath = assertSafeRepositoryFilePath(path);
  const base = repoPath(repositoryFullName);
  const encodedPath = encodedRepositoryPath(cleanPath);
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

export async function commitGitHubTextFiles(
  accessToken: string,
  repositoryFullName: string,
  branch: string,
  expectedHeadSha: string,
  files: Array<{ path: string; content: string }>,
  message: string
) {
  if (!/^[a-f0-9]{40}$/i.test(expectedHeadSha)) {
    throw new Error("A full expected branch head SHA is required.");
  }
  if (!files.length || files.length > MAX_COMMIT_FILES) {
    throw new Error(`GitHub source commit must contain 1-${MAX_COMMIT_FILES} files.`);
  }

  const seen = new Set<string>();
  let totalBytes = 0;
  const tree = files.map((file) => {
    const cleanPath = assertSafeRepositoryFilePath(file.path);
    if (seen.has(cleanPath)) {
      throw new Error(`Duplicate repository file path: ${cleanPath}`);
    }
    seen.add(cleanPath);
    totalBytes += Buffer.byteLength(file.content, "utf8");
    if (totalBytes > MAX_COMMIT_BYTES) {
      throw new Error("GitHub source commit exceeds the configured size limit.");
    }
    return {
      path: cleanPath,
      mode: "100644",
      type: "blob",
      content: file.content
    };
  });

  const base = repoPath(repositoryFullName);
  const baseCommit = await githubRequest<{ tree: { sha: string } }>(
    accessToken,
    `${base}/git/commits/${expectedHeadSha}`
  );
  if (!/^[a-f0-9]{40}$/i.test(baseCommit.tree?.sha ?? "")) {
    throw new Error("GitHub returned an invalid base tree SHA.");
  }

  const createdTree = await githubRequest<{ sha: string }>(
    accessToken,
    `${base}/git/trees`,
    {
      method: "POST",
      body: {
        base_tree: baseCommit.tree.sha,
        tree
      }
    }
  );
  if (!/^[a-f0-9]{40}$/i.test(createdTree.sha ?? "")) {
    throw new Error("GitHub returned an invalid generated tree SHA.");
  }

  const commit = await githubRequest<{ sha: string }>(
    accessToken,
    `${base}/git/commits`,
    {
      method: "POST",
      body: {
        message,
        tree: createdTree.sha,
        parents: [expectedHeadSha]
      }
    }
  );
  if (!/^[a-f0-9]{40}$/i.test(commit.sha ?? "")) {
    throw new Error("GitHub returned an invalid generated commit SHA.");
  }

  const branchPath = branch.split("/").map(encodeURIComponent).join("/");
  await githubRequest(accessToken, `${base}/git/refs/heads/${branchPath}`, {
    method: "PATCH",
    body: { sha: commit.sha, force: false }
  });

  return commit.sha;
}

export async function getGitHubTextFile(
  accessToken: string,
  repositoryFullName: string,
  ref: string,
  path: string
) {
  const cleanPath = assertSafeRepositoryFilePath(path);
  const base = repoPath(repositoryFullName);
  try {
    const result = await githubRequest<{
      type: string;
      encoding?: string;
      content?: string;
    }>(
      accessToken,
      `${base}/contents/${encodedRepositoryPath(cleanPath)}?ref=${encodeURIComponent(ref)}`
    );
    if (result.type !== "file" || result.encoding !== "base64" || !result.content) {
      throw new Error("GitHub returned an unsupported repository file response.");
    }
    return Buffer.from(result.content.replace(/\n/g, ""), "base64").toString("utf8");
  } catch (error) {
    if (error instanceof GitHubRequestError && error.status === 404) return null;
    throw error;
  }
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

export async function findOpenGitHubPullRequest(
  accessToken: string,
  repositoryFullName: string,
  input: { head: string; base: string }
) {
  const { owner } = parseRepositoryFullName(repositoryFullName);
  const base = repoPath(repositoryFullName);
  const query = new URLSearchParams({
    state: "open",
    head: `${owner}:${input.head}`,
    base: input.base,
    per_page: "10"
  });
  const results = await githubRequest<
    Array<{ number: number; html_url: string; head: { sha: string; ref: string }; base: { ref: string } }>
  >(accessToken, `${base}/pulls?${query.toString()}`);

  const exact = results.find(
    (pullRequest) =>
      pullRequest.head.ref === input.head && pullRequest.base.ref === input.base
  );
  if (!exact) return null;
  return {
    number: exact.number,
    url: exact.html_url,
    headSha: exact.head.sha
  };
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
