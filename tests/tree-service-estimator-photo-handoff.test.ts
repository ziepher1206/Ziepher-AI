import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const jobPage = readFileSync("app/operate/jobs/[jobId]/page.tsx", "utf8");
const estimatePage = readFileSync("app/operate/estimates/[estimateId]/page.tsx", "utf8");
const siteContext = readFileSync("components/operate-estimate-site-context.tsx", "utf8");
const siteContextRoute = readFileSync("app/api/operate/estimates/[estimateId]/site-context/route.ts", "utf8");

describe("Tree Service estimator-to-field handoff", () => {
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

  it("captures property access, hazard, and tree context during estimating", () => {
    expect(estimatePage).toContain("<OperateEstimateSiteContext");
    expect(estimatePage).toContain("access_notes,hazard_notes,tree_notes");
    expect(siteContext).toContain("Access, hazards & tree notes");
    expect(siteContext).toContain(`/api/operate/estimates/${"${estimateId}"}/site-context`);
    expect(siteContext).toContain("Save site context");
  });

  it("keeps site-context writes authenticated, workspace-scoped, bounded, and closed-estimate safe", () => {
    expect(siteContextRoute).toContain("Authentication required.");
    expect(siteContextRoute).toContain("z.string().max(4000)");
    expect(siteContextRoute).toContain("z.string().max(8000)");
    expect(siteContextRoute).toContain('["accepted", "declined", "expired", "canceled"]');
    expect(siteContextRoute).toContain('.eq("workspace_id", estimate.workspace_id)');
    expect(siteContextRoute).toContain("update.tree_notes = { ...existing, summary:");
  });
});
