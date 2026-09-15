import type { BuildArtifact } from "@/lib/ai/build-types";

export type VisualQualityFinding = {
  key: string;
  severity: "warning" | "info";
  title: string;
  detail: string;
};

export type VisualQualityReport = {
  score: number;
  passedChecks: string[];
  findings: VisualQualityFinding[];
};

function sourceText(artifact: BuildArtifact) {
  return [artifact.previewHtml, ...artifact.files.map((file) => file.content)].join("\n");
}

function hasAny(source: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(source));
}

export function evaluateVisualQuality(artifact: BuildArtifact): VisualQualityReport {
  const source = sourceText(artifact);
  const findings: VisualQualityFinding[] = [];
  const passedChecks: string[] = [];
  let score = 100;

  const checks = [
    {
      key: "responsive",
      title: "Responsive layout",
      passed: hasAny(source, [/@media\s*\(/i, /sm:/, /md:/, /lg:/, /min-width|max-width/i]),
      detail: "Add deliberate mobile, tablet, and desktop behavior instead of relying on one fixed layout.",
      penalty: 14
    },
    {
      key: "primary-action",
      title: "Clear primary action",
      passed: hasAny(source, [/<button\b/i, /className=.*button/i, /href=.*contact/i, /book|schedule|get started|request|call|buy|start/i]),
      detail: "Make the main action visually obvious and easy to reach, especially on mobile.",
      penalty: 14
    },
    {
      key: "imagery",
      title: "Purposeful imagery",
      passed: hasAny(source, [/<img\b/i, /next\/image/i, /background-image/i, /project-media\//i, /<svg\b/i]),
      detail: "Use real customer imagery or purposeful graphics so the result does not feel like a text-only starter template.",
      penalty: 12
    },
    {
      key: "image-treatment",
      title: "Image treatment",
      passed: hasAny(source, [/object-fit/i, /object-cover/i, /aspect-ratio/i, /overflow:\s*hidden/i, /rounded/i]),
      detail: "Give images deliberate crops, aspect ratios, and presentation instead of dropping them into raw boxes.",
      penalty: 8
    },
    {
      key: "hierarchy",
      title: "Content hierarchy",
      passed: hasAny(source, [/<h1\b/i, /<h2\b/i]) && hasAny(source, [/<section\b/i, /<main\b/i]),
      detail: "Strengthen page hierarchy with a clear hero, section rhythm, and meaningful heading levels.",
      penalty: 12
    },
    {
      key: "accessibility",
      title: "Accessibility basics",
      passed: hasAny(source, [/alt=/i, /aria-label/i, /aria-labelledby/i]) && hasAny(source, [/<main\b/i, /role=["']main["']/i]),
      detail: "Add semantic structure and accessible labels/alternative text before treating the build as finished.",
      penalty: 12
    },
    {
      key: "visual-depth",
      title: "Visual depth",
      passed: hasAny(source, [/box-shadow/i, /linear-gradient/i, /radial-gradient/i, /backdrop-filter/i, /border-radius/i, /rounded-/i]),
      detail: "Add deliberate surfaces, depth, framing, or graphic treatment so important sections do not all look identical.",
      penalty: 8
    },
    {
      key: "navigation",
      title: "Usable navigation",
      passed: hasAny(source, [/<nav\b/i, /navigation/i, /menu/i]) || artifact.files.length <= 2,
      detail: "Give multi-section or multi-page builds a clear navigation path and obvious way back.",
      penalty: 8
    }
  ];

  for (const check of checks) {
    if (check.passed) {
      passedChecks.push(check.title);
    } else {
      score -= check.penalty;
      findings.push({
        key: check.key,
        severity: "warning",
        title: check.title,
        detail: check.detail
      });
    }
  }

  if (artifact.previewHtml.length < 1800) {
    score -= 10;
    findings.push({
      key: "preview-detail",
      severity: "warning",
      title: "Preview detail",
      detail: "The preview is unusually small. Make the preview representative of the finished visual experience rather than a stripped-down wireframe."
    });
  } else {
    passedChecks.push("Preview detail");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    passedChecks,
    findings
  };
}
