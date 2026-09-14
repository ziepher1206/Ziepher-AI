type EnvLike = Readonly<Record<string, string | undefined>>;

export function configuredAIMonthlyBudgetUsd(env: EnvLike = process.env) {
  const raw = env.ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD;
  const value = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      "Live AI requires a positive ZLIFE_AI_MONTHLY_PROVIDER_BUDGET_USD safety cap."
    );
  }
  return value;
}

export function assertAIProviderBudget(
  spentUsd: number,
  env: EnvLike = process.env
) {
  const budgetUsd = configuredAIMonthlyBudgetUsd(env);
  const safeSpent = Number.isFinite(spentUsd) && spentUsd > 0 ? spentUsd : 0;
  if (safeSpent >= budgetUsd) {
    throw new Error(
      `ZLife AI monthly provider budget reached ($${safeSpent.toFixed(2)} of $${budgetUsd.toFixed(2)}).`
    );
  }
  return { spentUsd: safeSpent, budgetUsd, remainingUsd: budgetUsd - safeSpent };
}

export function currentUtcMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
