export type PaidAIProvider = "openai" | "gemini";
export type AIProvider = PaidAIProvider | "deterministic";

const PAID_PROVIDERS: PaidAIProvider[] = ["openai", "gemini"];

function parseConfiguredProvider(value: string | undefined): AIProvider | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "openai" || normalized === "gemini" || normalized === "deterministic") {
    return normalized;
  }
  throw new Error(
    "ZIEPHER_AI_PRIMARY_PROVIDER must be openai, gemini, or deterministic."
  );
}

export function primaryAIProvider(env: NodeJS.ProcessEnv = process.env): AIProvider {
  const configured = parseConfiguredProvider(env.ZIEPHER_AI_PRIMARY_PROVIDER);
  if (configured) return configured;

  // OpenAI is Ziepher's default paid provider. A configured Google key remains
  // usable, but it no longer silently outranks an existing OpenAI connection.
  if (env.OPENAI_API_KEY) return "openai";
  if (env.GOOGLE_AI_API_KEY) return "gemini";
  return "deterministic";
}

export function paidAIProviderOrder(
  env: NodeJS.ProcessEnv = process.env
): PaidAIProvider[] {
  const primary = primaryAIProvider(env);
  if (primary === "deterministic") return [];

  const order: PaidAIProvider[] = [primary];
  if (env.ZIEPHER_AI_ALLOW_PAID_FALLBACK !== "true") return order;

  for (const provider of PAID_PROVIDERS) {
    if (provider !== primary) order.push(provider);
  }
  return order;
}
