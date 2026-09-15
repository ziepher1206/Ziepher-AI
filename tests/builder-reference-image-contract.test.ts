import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_BUILD_REFERENCE_IMAGES,
  canSendReferenceImageToBuildModel
} from "../lib/ai/build-reference-images";
import { appPlanSchema } from "../lib/ai/types";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("builder visual reference contract", () => {
  it("limits the number of reference images sent to a paid build", () => {
    expect(MAX_BUILD_REFERENCE_IMAGES).toBe(4);
  });

  it("only sends image formats supported by the vision build path", () => {
    expect(canSendReferenceImageToBuildModel("image/jpeg")).toBe(true);
    expect(canSendReferenceImageToBuildModel("image/png")).toBe(true);
    expect(canSendReferenceImageToBuildModel("image/webp")).toBe(true);
    expect(canSendReferenceImageToBuildModel("image/gif")).toBe(true);
    expect(canSendReferenceImageToBuildModel("image/heic")).toBe(false);
    expect(canSendReferenceImageToBuildModel("image/avif")).toBe(false);
  });

  it("keeps project identity optional for older saved plans", () => {
    const plan = appPlanSchema.parse({
      title: "Reference-aware website",
      summary: "A sufficiently detailed project summary for the builder contract test.",
      targetUsers: ["Business owner"],
      features: [
        { name: "Home", description: "Conversion-focused home page", priority: "must" },
        { name: "Gallery", description: "Project imagery and proof", priority: "must" },
        { name: "Contact", description: "Simple lead capture", priority: "must" }
      ],
      screens: [
        { name: "Home", purpose: "Introduce the business and core offer" },
        { name: "Contact", purpose: "Let visitors request service" }
      ],
      visualDirections: [
        { id: "a", name: "A", description: "Dark premium visual direction" },
        { id: "b", name: "B", description: "Editorial visual direction" },
        { id: "c", name: "C", description: "Bold visual direction" },
        { id: "d", name: "D", description: "Clean visual direction" }
      ],
      buildPhases: [
        { name: "Plan", outcome: "Approved structure", billable: false },
        { name: "Build", outcome: "Working application", billable: true },
        { name: "Test", outcome: "Validated application", billable: true },
        { name: "Release", outcome: "Approved release", billable: true }
      ],
      recommendedStack: ["Next.js"],
      integrationOrder: ["auth", "data", "payments", "release"]
    });

    expect(plan.projectId).toBeUndefined();
  });

  it("does not load or send visual references unless the paid build route is allowed", () => {
    const router = read("lib/ai/build-router.ts");
    const paidGuard = router.indexOf("if (!options.allowPaidProvider)");
    const referenceLoad = router.indexOf("referenceImagesForPaidBuild(plan, options)");
    expect(paidGuard).toBeGreaterThan(-1);
    expect(referenceLoad).toBeGreaterThan(paidGuard);

    const provider = read("lib/ai/providers/openai-build.ts");
    expect(provider).toContain('type: "input_image"');
    expect(provider).toContain('detail: "high"');
  });
});
