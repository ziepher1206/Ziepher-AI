import { describe, expect, it } from "vitest";
import { createDeterministicPlan } from "../lib/ai/deterministic-plan";
import { createDeterministicBuild } from "../lib/ai/deterministic-build";
import { buildArtifactSchema } from "../lib/ai/build-types";
import { validateGeneratedArtifact } from "../lib/runner/security";

describe("deterministic application build", () => {
  it("creates a complete buildable source manifest", () => {
    const plan = createDeterministicPlan(
      "Build a customer portal with requests, documents, and notifications."
    );
    const artifact = createDeterministicBuild(
      plan,
      plan.visualDirections[0]!.id
    );

    expect(() => buildArtifactSchema.parse(artifact)).not.toThrow();
    expect(() => validateGeneratedArtifact(artifact)).not.toThrow();

    const paths = artifact.files.map((file) => file.path);
    expect(paths).toContain("package.json");
    expect(paths).toContain("app/page.tsx");
    expect(paths).toContain("app/globals.css");
    expect(artifact.previewHtml).toContain("<!doctype html>");
  });

  it("does not generate payment implementation in the core build", () => {
    const plan = createDeterministicPlan(
      "Build an online store with a cart and payments."
    );
    const artifact = createDeterministicBuild(
      plan,
      plan.visualDirections[0]!.id
    );
    const source = artifact.files.map((file) => file.content).join("\n");

    expect(source).not.toContain("checkout.sessions.create");
    expect(source).not.toContain("sk_live_");
  });
});
