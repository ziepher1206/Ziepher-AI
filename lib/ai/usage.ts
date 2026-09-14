export type AIUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  providerCostUsd: number;
  pricingKnown: boolean;
};

type TokenRates = {
  inputPerMillion: number;
  cachedInputPerMillion: number;
  outputPerMillion: number;
};

const OPENAI_RATES: Record<string, TokenRates> = {
  "gpt-5.6-luna": {
    inputPerMillion: 0.2,
    cachedInputPerMillion: 0.02,
    outputPerMillion: 1.2
  },
  "gpt-5.6-terra": {
    inputPerMillion: 2,
    cachedInputPerMillion: 0.2,
    outputPerMillion: 12
  },
  "gpt-5.6-sol": {
    inputPerMillion: 4,
    cachedInputPerMillion: 0.4,
    outputPerMillion: 20
  },
  "gpt-5.6": {
    inputPerMillion: 4,
    cachedInputPerMillion: 0.4,
    outputPerMillion: 20
  }
};

function finiteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

export function estimateOpenAIProviderCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens = 0
) {
  const rates = OPENAI_RATES[model];
  if (!rates) return { costUsd: 0, pricingKnown: false };

  const input = finiteNonNegative(inputTokens);
  const output = finiteNonNegative(outputTokens);
  const cached = Math.min(input, finiteNonNegative(cachedInputTokens));
  const uncached = Math.max(0, input - cached);

  // GPT-5.6 requests above 272K input tokens use long-context pricing for
  // the full request: 2x input/cached-input and 1.5x output.
  const longContext = input > 272_000;
  const inputMultiplier = longContext ? 2 : 1;
  const outputMultiplier = longContext ? 1.5 : 1;

  const costUsd =
    ((uncached * rates.inputPerMillion +
      cached * rates.cachedInputPerMillion) *
      inputMultiplier +
      output * rates.outputPerMillion * outputMultiplier) /
    1_000_000;

  return {
    costUsd: Number(costUsd.toFixed(8)),
    pricingKnown: true
  };
}

export function openAIUsageFromResponse(
  model: string,
  usage:
    | {
        input_tokens?: number | null;
        output_tokens?: number | null;
        input_tokens_details?: { cached_tokens?: number | null } | null;
      }
    | null
    | undefined
): AIUsage {
  const inputTokens = finiteNonNegative(usage?.input_tokens);
  const outputTokens = finiteNonNegative(usage?.output_tokens);
  const cachedInputTokens = finiteNonNegative(
    usage?.input_tokens_details?.cached_tokens
  );
  const { costUsd, pricingKnown } = estimateOpenAIProviderCostUsd(
    model,
    inputTokens,
    outputTokens,
    cachedInputTokens
  );

  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    providerCostUsd: costUsd,
    pricingKnown
  };
}

export const ZERO_AI_USAGE: AIUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
  providerCostUsd: 0,
  pricingKnown: false
};
