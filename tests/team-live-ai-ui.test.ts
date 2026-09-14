import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const consoleSource = readFileSync("components/agent-team-console.tsx", "utf8");
const pageSource = readFileSync("app/team/page.tsx", "utf8");

describe("guarded live agent team UI", () => {
  it("keeps deterministic mode as the default and requires per-run confirmation", () => {
    expect(consoleSource).toContain('useState<RunMode>("dry_run")');
    expect(consoleSource).toContain("confirmPaidAI");
    expect(consoleSource).toContain("I explicitly approve provider usage for this one team run");
    expect(consoleSource).toContain("mode === \"live\" ? confirmPaidAI : false");
  });

  it("only advertises live readiness when all server gates are configured", () => {
    expect(pageSource).toContain("SITE_REFINER_PAID_AI_ENABLED");
    expect(pageSource).toContain("ZIEPHER_AGENT_LIVE_ENABLED");
    expect(pageSource).toContain("OPENAI_API_KEY");
    expect(pageSource).toContain("ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD");
    expect(pageSource).toContain("OPENAI_AGENT_MAX_OUTPUT_TOKENS");
    expect(pageSource).toContain("liveAIAvailable={liveAIAvailable}");
  });
});
