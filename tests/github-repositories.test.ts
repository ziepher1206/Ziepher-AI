import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getGitHubRepositoryMetadata,
  listWritableGitHubRepositories
} from "../lib/source-control/github-repositories";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitHub repository discovery", () => {
  it("returns normalized repository metadata and push capability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            full_name: "ziepher1206/example",
            html_url: "https://github.com/ziepher1206/example",
            default_branch: "main",
            private: true,
            archived: false,
            disabled: false,
            permissions: { push: true }
          }),
          { status: 200 }
        )
      )
    );

    await expect(
      getGitHubRepositoryMetadata("token", "ziepher1206/example")
    ).resolves.toEqual({
      fullName: "ziepher1206/example",
      url: "https://github.com/ziepher1206/example",
      defaultBranch: "main",
      private: true,
      archived: false,
      disabled: false,
      canPush: true
    });
  });

  it("lists only writable active repositories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              full_name: "ziepher1206/writable",
              html_url: "https://github.com/ziepher1206/writable",
              default_branch: "main",
              private: false,
              archived: false,
              disabled: false,
              permissions: { push: true }
            },
            {
              full_name: "ziepher1206/read-only",
              html_url: "https://github.com/ziepher1206/read-only",
              default_branch: "main",
              private: false,
              archived: false,
              disabled: false,
              permissions: { pull: true, push: false }
            },
            {
              full_name: "ziepher1206/archived",
              html_url: "https://github.com/ziepher1206/archived",
              default_branch: "main",
              private: false,
              archived: true,
              disabled: false,
              permissions: { push: true }
            }
          ]),
          { status: 200 }
        )
      )
    );

    const repositories = await listWritableGitHubRepositories("token");
    expect(repositories.map((repository) => repository.fullName)).toEqual([
      "ziepher1206/writable"
    ]);
  });
});
