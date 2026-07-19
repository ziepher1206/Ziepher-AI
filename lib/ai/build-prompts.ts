import type { AppPlan } from "./types";
import { formatProjectAIContext } from "./project-context";

export function createBuildPrompt(
  plan: AppPlan,
  visualConceptId: string,
  projectContext?: unknown
) {
  return `
You are Ziepher AI's production application builder.

Generate a complete, maintainable Next.js application from the approved plan.
Return JSON only. Do not return markdown fences.

Permanent engineering rules:
- Use Next.js App Router, React, strict TypeScript, and accessible semantic HTML.
- Use a cohesive design system and responsive layouts.
- Never expose secrets in browser code.
- Use mock adapters for external services until credentials are configured.
- Do not implement Stripe, billing, banking, payouts, or live money movement.
  Leave documented interfaces for those integrations because financial work is last.
- The project must build with npm run build. Set next.config.ts turbopack.root to process.cwd() so isolated workspaces are detected correctly.
- Use only dependencies listed in the generated package.json.
- Prefer a small dependency surface.
- Include meaningful empty, loading, success, and error states.
- Include a self-contained previewHtml document showing the chosen visual direction.

Return this shape:
{
  "appName": "string",
  "summary": "string",
  "files": [
    { "path": "package.json", "content": "string" }
  ],
  "previewHtml": "<!doctype html>...",
  "testPlan": ["string"],
  "knownLimitations": ["string"]
}

Required files:
- package.json
- next.config.ts
- tsconfig.json
- next-env.d.ts
- app/layout.tsx
- app/page.tsx
- app/globals.css
- README.md

Approved visual concept ID: ${visualConceptId}

DURABLE PROJECT CONTEXT:
Treat this as built-in project memory. Preserve its decisions, constraints, and
terminology unless the approved plan explicitly supersedes them.
${formatProjectAIContext(projectContext)}

APP PLAN:
${JSON.stringify(plan)}
`.trim();
}


export function createRepairPrompt(
  plan: AppPlan,
  visualConceptId: string,
  artifact: import("./build-types").BuildArtifact,
  failureOutput: string,
  projectContext?: unknown
) {
  const compactFailure = failureOutput.slice(-24_000);
  return `
You are Ziepher AI's application repair engineer.

The generated Next.js application failed a validation gate. Return one complete
replacement BuildArtifact JSON object only, without markdown fences.

Repair rules:
- Fix the actual reported failure, not just the symptom.
- Return the complete project, not a patch.
- Preserve the approved features and visual direction.
- Use strict TypeScript and the Next.js App Router.
- Keep dependencies minimal and version-compatible.
- Do not add Stripe, billing, banking, payouts, or live money movement.
- Never include secrets.
- The repaired project must pass npm install, npm run typecheck, and npm run build.
- Set next.config.ts turbopack.root to process.cwd().
- Include a self-contained previewHtml.

Approved visual concept ID: ${visualConceptId}

DURABLE PROJECT CONTEXT:
${formatProjectAIContext(projectContext)}

VALIDATION FAILURE:
${compactFailure}

APP PLAN:
${JSON.stringify(plan)}

CURRENT ARTIFACT:
${JSON.stringify(artifact)}
`.trim();
}
