import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const jobPage = readFileSync("app/operate/jobs/[jobId]/page.tsx", "utf8");

describe("Tree Service estimator photo handoff", () => {
  it("loads estimate media for the job's linked estimate inside the same workspace", () => {
    expect(jobPage).toContain('from("operate_estimate_media")');
    expect(jobPage).toContain('.eq("workspace_id", job.workspace_id)');
    expect(jobPage).toContain('.eq("estimate_id", estimate.id)');
  });

  it("creates short-lived signed URLs instead of exposing private storage paths directly", () => {
    expect(jobPage).toContain("createSignedUrl(item.storage_path, 60 * 30)");
    expect(jobPage).not.toContain("getPublicUrl(item.storage_path)");
  });

  it("shows estimator photos before the job-photo workflow so crews receive field context", () => {
    expect(jobPage).toContain("Estimate handoff");
    expect(jobPage).toContain("Estimator field photos");
    expect(jobPage).toContain("scope, access, and hazards before work starts");
    expect(jobPage.indexOf("Estimator field photos")).toBeLessThan(jobPage.indexOf("<OperateJobPhotoUpload"));
  });
});
