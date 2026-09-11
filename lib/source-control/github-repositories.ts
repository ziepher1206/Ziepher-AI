import "server-only";

import { parseRepositoryFullName } from "./lifecycle";

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

type GitHubRepositoryResponse = {
  full_name: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  archived: boolean;
  disabled: boolean;
  permissions?: {
    admin?: boolean;
    maintain?: boolean;
    push?: boolean;
    triage?: boolean;
    pull?: boolean;
  };
};

function authHeaders(accessToken: string) {
  if (!accessToken.trim()) throw new Error("GitHub access token is required.");
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "X-GitHub-Api-Version": API_VERSION
  };
}

function repositoryPath(repositoryFullName: string) {
  const { owner, repo } = parseRepositoryFullName(repositoryFullName);
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

function normalizeRepository(repository: GitHubRepositoryResponse) {
  return {
    fullName: repository.full_name,
    url: repository.html_url,
    defaultBranch: repository.default_branch,
    private: repository.private,
    archived: repository.archived,
    disabled: repository.disabled,
    canPush: repository.permissions?.push === true || repository.permissions?.admin === true || repository.permissions?.maintain === true
  };
}

export async function getGitHubRepositoryMetadata(
  accessToken: string,
  repositoryFullName: string
) {
  const response = await fetch(
    `${GITHUB_API}${repositoryPath(repositoryFullName)}`,
    {
      headers: authHeaders(accessToken),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const requestId = response.headers.get("x-github-request-id");
    throw new Error(
      `GitHub repository lookup failed (${response.status})${requestId ? ` [${requestId}]` : ""}`
    );
  }

  const repository = (await response.json()) as GitHubRepositoryResponse;
  if (!repository.full_name || !repository.default_branch || !repository.html_url) {
    throw new Error("GitHub returned incomplete repository metadata.");
  }
  return normalizeRepository(repository);
}

export async function listWritableGitHubRepositories(accessToken: string) {
  const repositories: ReturnType<typeof normalizeRepository>[] = [];

  // Keep discovery bounded. 300 repositories is more than enough for the
  // internal-first stage and prevents an unbounded provider request loop.
  for (let page = 1; page <= 3; page += 1) {
    const url = new URL(`${GITHUB_API}/user/repos`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "updated");
    url.searchParams.set("affiliation", "owner,collaborator,organization_member");

    const response = await fetch(url, {
      headers: authHeaders(accessToken),
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`GitHub repository listing failed (${response.status}).`);
    }

    const pageRows = (await response.json()) as GitHubRepositoryResponse[];
    repositories.push(
      ...pageRows
        .map(normalizeRepository)
        .filter((repository) => repository.canPush && !repository.archived && !repository.disabled)
    );

    if (pageRows.length < 100) break;
  }

  return repositories;
}
