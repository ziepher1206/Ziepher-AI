import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canSendReferenceImageToBuildModel,
  MAX_BUILD_REFERENCE_IMAGES
} from "../lib/ai/build-reference-images";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("builder design-reference image contract", () => {
  it("limits supported reference-image inputs", () => {
    expect(MAX_BUILD_REFERENCE_IMAGES).toBe(4);
    expect(canSendReferenceImageToBuildModel("image/jpeg")).toBe(true);
    expect(canSendReferenceImageToBuildModel("image/png")).toBe(true);
    expect(canSendReferenceImageToBuildModel("image/webp")).toBe(true);
    expect(canSendReferenceImageToBuildModel("image/gif")).toBe(true);
    expect(canSendReferenceImageToBuildModel("image/heic")).toBe(false);
  });

  it("loads only explicit design references through short-lived signed URLs", () => {
    const loader = read("lib/ai/build-reference-images.ts");
    expect(loader).toContain('provenance.purpose === "design_reference"');
    expect(loader).toContain('.eq("usage_status", "available")');
    expect(loader).toContain("createSignedUrl");
    expect(loader).toContain("REFERENCE_URL_TTL_SECONDS");
  });

  it("keeps image loading behind the paid-build gate", () => {
    const router = read("lib/ai/build-router.ts");
    const paidGate = router.indexOf("if (!options.allowPaidProvider)");
    const imageLoad = router.indexOf("referenceImagesForPaidBuild");
    expect(paidGate).toBeGreaterThan(-1);
    expect(imageLoad).toBeGreaterThan(-1);
    expect(router).toContain("buildWithOpenAI(prompt, model, referenceImages)");
  });

  it("sends visual references as high-detail image inputs", () => {
    const provider = read("lib/ai/providers/openai-build.ts");
    expect(provider).toContain('type: "input_image"');
    expect(provider).toContain('detail: "high"');
    expect(provider).toContain("referenceImages");
  });
});
