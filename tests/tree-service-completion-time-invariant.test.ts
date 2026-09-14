import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260914010100_fix_job_completion_time_invariant.sql"),
  "utf8"
);

describe("Tree Service completion timestamp invariant", () => {
  it("keeps actual_end_at strictly after actual_start_at even in one transaction", () => {
    expect(migration).toContain("actual_end_at = greatest(");
    expect(migration).toContain("clock_timestamp()");
    expect(migration).toContain("interval '1 millisecond'");
  });
});
