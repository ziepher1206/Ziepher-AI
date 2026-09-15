import { describe, expect, it } from "vitest";
import { createDeterministicBuild } from "../lib/ai/deterministic-build";
import { createDeterministicPlan } from "../lib/ai/deterministic-plan";
import { evaluateVisualQuality } from "../lib/runner/visual-quality";

describe("no-credit deterministic build quality", () => {
  it("creates a detailed, responsive visual preview without a paid provider", () => {
    const plan = createDeterministicPlan(
      "Create a modern service-business website with strong calls to action, clear services, trust, and mobile usability."
    );
    const conceptId = plan.visualDirections[0]?.id ?? "quiet-premium";
    const artifact = createDeterministicBuild(plan, conceptId);
    const report = evaluateVisualQuality(artifact);

    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(artifact.previewHtml).toContain("visual-stage");
    expect(artifact.previewHtml).toContain("trust-strip");
    expect(artifact.previewHtml).toContain("journey-grid");
    expect(artifact.previewHtml).toContain("<svg");
    expect(artifact.previewHtml).toContain("@media(max-width:620px)");
    expect(artifact.previewHtml).toContain("Z-Life no-credit preview");
  });

  it("does not introduce paid-provider or production actions", () => {
    const source = createDeterministicBuild.toString();
    expect(source).not.toContain("OPENAI_API_KEY");
    expect(source).not.toContain("GOOGLE_AI_API_KEY");
    expect(source).not.toContain("deploy_to_vercel");
    expect(source).not.toContain("checkout.sessions.create");
  });
});
