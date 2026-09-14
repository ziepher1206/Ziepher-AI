import { describe, expect, it } from "vitest";
import {
  assertAIProviderBudget,
  configuredAIMonthlyBudgetUsd
} from "../lib/ai/spend-guard";

describe("AI spend guard", () => {
  it("fails closed when no positive monthly budget is configured", () => {
    expect(() => configuredAIMonthlyBudgetUsd({})).toThrow(
      "ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD"
    );
    expect(() =>
      configuredAIMonthlyBudgetUsd({ ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD: "0" })
    ).toThrow("ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD");
  });

  it("allows usage below the cap and reports remaining budget", () => {
    expect(
      assertAIProviderBudget(3.25, {
        ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD: "10"
      })
    ).toEqual({ spentUsd: 3.25, budgetUsd: 10, remainingUsd: 6.75 });
  });

  it("blocks provider calls once the cap is reached", () => {
    expect(() =>
      assertAIProviderBudget(10, {
        ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD: "10"
      })
    ).toThrow("monthly provider budget reached");
  });
});
