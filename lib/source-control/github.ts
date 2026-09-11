import "server-only";

import { parseRepositoryFullName, type SourceControlStage } from "./lifecycle";

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";
const FULL_SHA = /^[a-f0-9]{40}$/i;

type GitHubRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
};

type AtomicSourceFile = {
  path: string;
  content: string;
};

type GitHubCommitObject = {
  sha: string;
  message: string;
  tree: { sha: string };
  parents: Array<{ sha: string }>;
};

class GitHubApiError extends Error {
  constructor(
    readonly status: number,
    readonly requestId: string | null
  ) {
    super(`GitHub API request failed (${status})${requestId ? ` [${requestId}]` : ""}`);
    this.name = "GitHubApiError";
  }
}

async function githubRequest<T>(
  accessToken: string,
  requestPath: string,
  options: GitHubRequestOptions = {}
): Promise<T> {
  if (!accessToken.trim()) throw new Error("GitHub access token is required.");
  const response = await fetch(`${GITHUB_API}${requestPath}`, {
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
    throw new GitHubApiError(
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

function assertFullSha(value: string, message: string) {
  if (!FULL_SHA.test(value)) throw new Error(message);
  return value.toLowerCase();
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
  return assertFullSha(result.object.sha, "GitHub returned an invalid branch SHA.");
}

async function getOptionalGitHubRefSha(
  accessToken: string,
  repositoryFullName: string,
  branch: string
) {
  try {
    return await getGitHubRefSha(accessToken, repositoryFullName, branch);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) return null;
    throw error;
  }
}

async function getGitHubCommitObject(
  accessToken: string,
  repositoryFullName: string,
  commitSha: string
): Promise<GitHubCommitObject> {
  const sha = assertFullSha(commitSha, "A full commit SHA is required.");
  const base = repoPath(repositoryFullName);
  const result = await githubRequest<{
    sha: string;
    message: string;
    tree: { sha: string };
    parents: Array<{ sha: string }>;
  }>(accessToken, `${base}/git/commits/${sha}`);

  return {
    sha: assertFullSha(result.sha, "GitHub returned an invalid commit SHA."),
    message: result.message,
    tree: {
      sha: assertFullSha(result.tree.sha, "GitHub returned an invalid tree SHA.")
    },
    parents: (result.parents ?? []).map((parent) => ({
      sha: assertFullSha(parent.sha, "GitHub returned an invalid parent SHA.")
    }))
  };
}

export async function createGitHubBranch(
  accessToken: string,
  repositoryFullName: string,
  branch: string,
  baseSha: string
) {
  const sha = assertFullSha(baseSha, "A full base commit SHA is required.");
  const base = repoPath(repositoryFullName);
  await githubRequest(accessToken, `${base}/git/refs`, {
    method: "POST",
    body: { ref: `refs/heads/${branch}`, sha }
  });
}

export async function ensureGitHubBranchAtBase(
  accessToken: string,
  repositoryFullName: string,
  baseBranch: string,
  workingBranch: string
) {
  const baseSha = await getGitHubRefSha(
    accessToken,
    repositoryFullName,
    baseBranch
  );

  const existingSha = await getOptionalGitHubRefSha(
    accessToken,
    repositoryFullName,
    workingBranch
  );

  if (existingSha) {
    if (existingSha !== baseSha) {
      throw new Error(
        "Ziepher working branch already exists at an unexpected commit. Refusing to overwrite it."
      );
    }
    return { baseSha, created: false };
  }

  try {
    await createGitHubBranch(
      accessToken,
      repositoryFullName,
      workingBranch,
      baseSha
    );
    return { baseSha, created: true };
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 422) {
      const racedSha = await getOptionalGitHubRefSha(
        accessToken,
        repositoryFullName,
        workingBranch
      );
      if (racedSha === baseSha) return { baseSha, created: false };
    }
    throw error;
  }
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  limit: number,
  mapper: (value: T) => Promise<R>
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    for (;;) {
      const index = nextIndex++;
      if (index >= values.length) return;
      results[index] = await mapper(values[index]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker())
  );
  return results;
}

function atomicCommitMessage(input: {
  buildJobId: string;
  runId: string;
  sourceSha256: string;
}) {
  return [
    `Ziepher build ${input.buildJobId}`,
    "",
    `Ziepher-Source-Control-Run: ${input.runId}`,
    `Ziepher-Source-SHA256: ${input.sourceSha256.toLowerCase()}`
  ].join("\n");
}

export async function publishGitHubFilesAtomically(
  accessToken: string,
  repositoryFullName: string,
  input: {
    branch: string;
    expectedParentSha: string;
    runId: string;
    buildJobId: string;
    sourceSha256: string;
    files: readonly AtomicSourceFile[];
  }
) {
  const expectedParentSha = assertFullSha(
    input.expectedParentSha,
    "A full expected parent SHA is required."
  );
  if (!/^[a-f0-9]{64}$/i.test(input.sourceSha256)) {
    throw new Error("A valid source SHA-256 is required.");
  }
  if (input.files.length < 1 || input.files.length > 120) {
    throw new Error("Generated source must contain between 1 and 120 files.");
  }

  const message = atomicCommitMessage(input);
  const currentHead = await getGitHubRefSha(
    accessToken,
    repositoryFullName,
    input.branch
  );

  if (currentHead !== expectedParentSha) {
    const currentCommit = await getGitHubCommitObject(
      accessToken,
      repositoryFullName,
      currentHead
    );
    if (
      currentCommit.parents.length === 1 &&
      currentCommit.parents[0]!.sha === expectedParentSha &&
      currentCommit.message === message
    ) {
      return { commitSha: currentHead, reconciled: true };
    }
    throw new Error(
      "Ziepher working branch moved unexpectedly before source publication. Refusing to overwrite it."
    );
  }

  const parentCommit = await getGitHubCommitObject(
    accessToken,
    repositoryFullName,
    expectedParentSha
  );
  const base = repoPath(repositoryFullName);

  const treeEntries = await mapWithConcurrency(input.files, 8, async (file) => {
    const blob = await githubRequest<{ sha: string }>(
      accessToken,
      `${base}/git/blobs`,
      {
        method: "POST",
        body: {
          content: file.content,
          encoding: "utf-8"
        }
      }
    );
    return {
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: assertFullSha(blob.sha, "GitHub returned an invalid blob SHA.")
    };
  });

  const tree = await githubRequest<{ sha: string }>(
    accessToken,
    `${base}/git/trees`,
    {
      method: "POST",
      body: {
        base_tree: parentCommit.tree.sha,
        tree: treeEntries
      }
    }
  );
  const treeSha = assertFullSha(tree.sha, "GitHub returned an invalid tree SHA.");

  const commit = await githubRequest<{ sha: string }>(
    accessToken,
    `${base}/git/commits`,
    {
      method: "POST",
      body: {
        message,
        tree: treeSha,
        parents: [expectedParentSha]
      }
    }
  );
  const commitSha = assertFullSha(
    commit.sha,
    "GitHub returned an invalid source commit SHA."
  );

  try {
    await githubRequest(
      accessToken,
      `${base}/git/refs/${encodeURIComponent(`heads/${input.branch}`)}`,
      {
        method: "PATCH",
        body: { sha: commitSha, force: false }
      }
    );
  } catch (error) {
    const reconciledHead = await getGitHubRefSha(
      accessToken,
      repositoryFullName,
      input.branch
    );
    if (reconciledHead === commitSha) {
      return { commitSha, reconciled: true };
    }
    throw error;
  }

  return { commitSha, reconciled: false };
}

export async function putGitHubFile(
  accessToken: string,
  repositoryFullName: string,
  branch: string,
  filePath: string,
  content: string,
  message: string,
  existingBlobSha?: string
) {
  const cleanPath = filePath.replace(/^\/+/, "");
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
  assertFullSha(headSha, "A full head commit SHA is required.");
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
  const expectedHeadSha = assertFullSha(
    input.expectedHeadSha,
    "A full expected head SHA is required."
  );

  const base = repoPath(repositoryFullName);
  const result = await githubRequest<{ sha: string; merged: boolean; message: string }>(
    accessToken,
    `${base}/pulls/${input.pullRequestNumber}/merge`,
    {
      method: "PUT",
      body: {
        sha: expectedHeadSha,
        merge_method: "squash"
      }
    }
  );

  if (!result.merged || !result.sha) {
    throw new Error("GitHub did not merge the approved pull request.");
  }
  return { mergeSha: result.sha, message: result.message };
}
