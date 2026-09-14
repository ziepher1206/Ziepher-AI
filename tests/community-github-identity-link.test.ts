import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("community GitHub identity linking", () => {
  it("links reviewers only from verified GitHub OAuth evidence", () => {
    const callback = read("app/api/connections/github/callback/route.ts");
    const oauth = read("lib/provider-connections/github-oauth.ts");

    expect(oauth).toContain("const user = await getGitHubUser(accessToken)");
    expect(oauth).toContain("return { connection, githubUser: user }");
    expect(callback).toContain("githubLogin: githubUser.login");
    expect(callback).not.toContain("displayName");
  });

  it("requires an existing verified maintainer identity and prevents account collisions", () => {
    const source = read("lib/community/identity-link.ts");

    expect(source).toContain("contributor.is_verified");
    expect(source).toContain("COMMUNITY_REVIEWER_STATUSES.includes(contributor.status)");
    expect(source).toContain("already linked to another ZLife account");
    expect(source).toContain("already linked to a different contributor identity");
    expect(source).toContain('.is("user_id", null)');
  });

  it("records identity linking in append-only contributor audit history", () => {
    const source = read("lib/community/identity-link.ts");

    expect(source).toContain('.from("contributor_status_events").insert');
    expect(source).toContain("Identity linked through verified GitHub OAuth");
    expect(source).toContain("previous_status: contributor.status");
    expect(source).toContain("new_status: contributor.status");
  });
});
