type EnvLike = Readonly<Record<string, string | undefined>>;

export type OpenAIOperation = "planning" | "build" | "agent";

const KEYS: Record<OpenAIOperation, string> = {
  planning: "OPENAI_PLANNING_MAX_OUTPUT_TOKENS",
  build: "OPENAI_BUILD_MAX_OUTPUT_TOKENS",
  agent: "OPENAI_AGENT_MAX_OUTPUT_TOKENS"
};

export function openAIMaxOutputTokens(
  operation: OpenAIOperation,
  env: EnvLike = process.env
) {
  const key = KEYS[operation];
  const raw = env[key];
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 64_000) {
    throw new Error(
      `Live OpenAI ${operation} requires ${key} to be an integer between 1 and 64000.`
    );
  }
  return parsed;
}
