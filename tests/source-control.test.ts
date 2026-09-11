import { describe, expect, it } from "vitest";
import {
  assertSourceControlTransition,
  canTransitionSourceControl,
  createWorkingBranchName,
  parseRepositoryFullName
} from "../lib/source-control/lifecycle";

describe("source-control lifecycle", () => {
  it("allows the guarded happy path", () => {
    const path = [
      ["queued", "branch_created"],
      ["branch_created", "changes_ready"],
      ["changes_ready", "pull_request_open"],
      ["pull_request_open", "checks_running"],
      ["checks_running", "preview_ready"],
      ["preview_ready", "approved"],
      ["approved", "merged"],
      ["merged", "production_verified"]
    ] as const;

    for (const [from, to] of path) {
      expect(canTransitionSourceControl(from, to)).toBe(true);
      expect(() => assertSourceControlTransition(from, to)).not.toThrow();
    }
  });

  it("prevents skipping approval before merge", () => {
    expect(canTransitionSourceControl("preview_ready", "merged")).toBe(false);
    expect(() => assertSourceControlTransition("preview_ready", "merged")).toThrow();
  });

  it("does not let blocked recovery bypass approval", () => {
    expect(canTransitionSourceControl("blocked", "approved")).toBe(false);
    expect(canTransitionSourceControl("blocked", "merged")).toBe(false);
    expect(canTransitionSourceControl("blocked", "preview_ready")).toBe(true);
  });

  it("creates stable isolated branch names", () => {
    expect(createWorkingBranchName("BDF3693D-4BAA-47F4-A51A-8370CA47CB44", "run_2026-09-10_001"))
      .toBe("ziepher/bdf3693d4baa/run202609100");
  });

  it("matches the database branch identity for UUID project and build ids", () => {
    expect(
      createWorkingBranchName(
        "BDF3693D-4BAA-47F4-A51A-8370CA47CB44",
        "38C23EE2-5704-4BD3-AB4C-BC9F33C6F432"
      )
    ).toBe("ziepher/bdf3693d4baa/38c23ee25704");
  });

  it("parses repository names", () => {
    expect(parseRepositoryFullName("ziepher1206/Ziepher-AI")).toEqual({
      owner: "ziepher1206",
      repo: "Ziepher-AI"
    });
  });
});
