import OpenAI from "openai";
import { agentById } from "./registry";
import { buildAgentSystemPrompt } from "./prompt";
import { shouldUseZLifeMock } from "../community/dev-mode";
import { assertZLifeLiveProviderAllowed } from "../community/provider-adapters";

export type AgentExecutionInput = {
  agentId: string;
  projectBrief: string;
  upstreamContext?: string;
};

export type AgentExecutionResult = {
  agentId: string;
  mode: "live" | "mock";
  model: string;
  output: string;
  developmentData?: boolean;
};

export function liveAgentExecutionEnabled() {
  return process.env.ZIEPHER_AGENT_LIVE_ENABLED === "true";
}

export async function executeLiveAgent(
  input: AgentExecutionInput
): Promise<AgentExecutionResult> {
  const agent = agentById.get(input.agentId);
  if (!agent) throw new Error(`Unknown Ziepher agent: ${input.agentId}`);

  const projectBrief = input.projectBrief.trim().slice(0, 12_000);
  const upstreamContext = input.upstreamContext?.trim().slice(0, 16_000) ?? "";
  if (!projectBrief) throw new Error("Project brief is required.");

  if (shouldUseZLifeMock("ai")) {
    return {
      agentId: agent.id,
      mode: "mock",
      model: "zlife-development-mock-ai-v1",
      developmentData: true,
      output: [
        "[ZLIFE DEVELOPMENT MOCK — NO EXTERNAL AI REQUEST SENT]",
        `Agent: ${agent.name}`,
        `Department: ${agent.department}`,
        `Project brief: ${projectBrief}`,
        upstreamContext ? `Upstream context: ${upstreamContext}` : "Upstream context: none",
        "Result: deterministic development-only specialist review placeholder."
      ].join("\n")
    };
  }

  if (!liveAgentExecutionEnabled()) {
    throw new Error("Live Ziepher agent execution is disabled.");
  }

  assertZLifeLiveProviderAllowed("ai");

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_AGENT_MODEL ?? process.env.OPENAI_PLANNING_MODEL;

  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  if (!model) {
    throw new Error(
      "OPENAI_AGENT_MODEL or OPENAI_PLANNING_MODEL must be configured."
    );
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: buildAgentSystemPrompt(agent) },
      {
        role: "user",
        content: [
          "PROJECT BRIEF",
          projectBrief,
          upstreamContext ? "\nUPSTREAM HANDOFF CONTEXT\n" + upstreamContext : "",
          "\nPerform only your specialist review. Do not claim to have changed code, production, external services, or data unless tool evidence explicitly proves that action occurred."
        ].join("\n")
      }
    ]
  });

  if (!response.output_text) {
    throw new Error(`${agent.name} returned an empty response.`);
  }

  return {
    agentId: agent.id,
    mode: "live",
    model,
    output: response.output_text
  };
}
