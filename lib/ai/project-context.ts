import {
  projectAIContextSchema,
  type ProjectAIContext
} from "../domain/schemas";

function list(label: string, values: string[]) {
  if (!values.length) return "";
  return `${label}:\n${values.map((value) => `- ${value}`).join("\n")}`;
}

export function parseProjectAIContext(value: unknown): ProjectAIContext {
  return projectAIContextSchema.parse(value ?? {});
}

export function formatProjectAIContext(value: unknown) {
  const context = parseProjectAIContext(value);
  const sections = [
    context.vision ? `Product vision:\n${context.vision}` : "",
    list("Target users", context.targetUsers),
    list("Permanent requirements", context.requirements),
    list("Decisions already made", context.decisions),
    list("Constraints and exclusions", context.constraints),
    list("Expected integrations", context.integrations),
    list("Additional project notes", context.notes)
  ].filter(Boolean);

  if (!sections.length) return "No durable project context has been saved yet.";
  return sections.join("\n\n").slice(0, 24_000);
}
