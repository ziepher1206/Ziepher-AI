import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/projects/[projectId]/ai-status/page.tsx", "utf8");
const studio = readFileSync("app/projects/[projectId]/studio/page.tsx", "utf8");

describe("ZLife AI provider status surface", () => {
  it("reports connection and safety gates without exposing secret values", () => {
    expect(page).toContain("AI connection and safety status");
    expect(page).toContain("OPENAI_API_KEY");
    expect(page).toContain("ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD");
    expect(page).toContain("SITE_REFINER_PAID_AI_ENABLED");
    expect(page).toContain("SITE_REFINER_PAID_BUILDS_ENABLED");
    expect(page).toContain("ZIEPHER_AGENT_LIVE_ENABLED");
    expect(page).toContain("Secret keys are never displayed");
    expect(page).not.toContain("process.env.OPENAI_API_KEY?.trim() ||");
  });

  it("links the AI workspace to the status page", () => {
    expect(studio).toContain("/ai-status");
    expect(studio).toContain("AI status");
  });
});
