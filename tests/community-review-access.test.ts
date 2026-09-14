import { describe, expect, it } from "vitest";

import { isAuthorizedCommunityReviewer } from "../lib/community/review-access";

describe("community review authorization", () => {
  const userId = "11111111-1111-1111-1111-111111111111";

  it.each(["module_maintainer", "core_contributor", "core_team"])(
    "allows a verified linked %s identity",
    (status) => {
      expect(
        isAuthorizedCommunityReviewer(
          {
            id: "contributor-id",
            user_id: userId,
            status,
            is_verified: true,
          },
          userId,
        ),
      ).toBe(true);
    },
  );

  it("rejects an unverified contributor identity", () => {
    expect(
      isAuthorizedCommunityReviewer(
        {
          id: "contributor-id",
          user_id: userId,
          status: "core_team",
          is_verified: false,
        },
        userId,
      ),
    ).toBe(false);
  });

  it("rejects a verified contributor that is not linked to the signed-in user", () => {
    expect(
      isAuthorizedCommunityReviewer(
        {
          id: "contributor-id",
          user_id: "22222222-2222-2222-2222-222222222222",
          status: "core_team",
          is_verified: true,
        },
        userId,
      ),
    ).toBe(false);
  });

  it.each([
    "community_member",
    "contributor",
    "verified_contributor",
    "zlife_developer",
  ])("rejects linked users without a maintainer-level role: %s", (status) => {
    expect(
      isAuthorizedCommunityReviewer(
        {
          id: "contributor-id",
          user_id: userId,
          status,
          is_verified: true,
        },
        userId,
      ),
    ).toBe(false);
  });

  it("rejects a contributor identity with no authenticated user link", () => {
    expect(
      isAuthorizedCommunityReviewer(
        {
          id: "contributor-id",
          user_id: null,
          status: "core_team",
          is_verified: true,
        },
        userId,
      ),
    ).toBe(false);
  });
});
