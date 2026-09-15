import { describe, expect, it } from "vitest";
import type { BuildArtifact } from "../lib/ai/build-types";
import { evaluateVisualQuality } from "../lib/runner/visual-quality";

function artifact(
  previewHtml: string,
  files: Array<{ path: string; content: string }> = []
): BuildArtifact {
  return {
    projectId: "11111111-1111-1111-1111-111111111111",
    appName: "Visual QA Test",
    files,
    previewHtml,
    summary: "Visual quality regression test artifact.",
    testPlan: ["Check layout", "Check mobile", "Check accessibility"],
    knownLimitations: []
  };
}

describe("zero-cost visual quality report", () => {
  it("flags a thin generic preview", () => {
    const report = evaluateVisualQuality(
      artifact("<html><body><h1>Title</h1><p>Text only</p></body></html>")
    );
    expect(report.score).toBeLessThan(70);
    expect(report.findings.map((finding) => finding.key)).toContain("responsive");
    expect(report.findings.map((finding) => finding.key)).toContain("imagery");
    expect(report.findings.map((finding) => finding.key)).toContain("preview-detail");
  });

  it("rewards responsive, structured, visual output", () => {
    const html = `<!doctype html><html><body><nav aria-label="Primary"><a href="#contact">Contact</a></nav><main><section><h1>Strong hero</h1><img src="/project-media/photo.jpg" alt="Team at work" style="object-fit:cover;aspect-ratio:16/9;border-radius:24px"/><button>Request an estimate</button></section><section><h2>Services</h2></section></main><style>@media (max-width: 720px){main{padding:16px}} .card{box-shadow:0 20px 60px rgba(0,0,0,.2)}</style>${"x".repeat(1900)}</body></html>`;
    const report = evaluateVisualQuality(artifact(html));
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.findings.length).toBeLessThanOrEqual(1);
  });
});
