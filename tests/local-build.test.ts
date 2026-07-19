import { describe, expect, it } from "vitest";
import { createDeterministicPlan } from "../lib/ai/deterministic-plan";
import { generateLocalApplication } from "../lib/local-build/generator";

describe("local working application build", () => {
  it("creates a standalone interactive app without external runtime dependencies", () => {
    const idea = "Build a customer request tracker with a dashboard and task list.";
    const plan = createDeterministicPlan(idea);
    const result = generateLocalApplication({
      idea,
      plan,
      conceptId: plan.visualDirections[0]!.id,
      qualityMode: "balanced"
    });

    expect(result.html).toContain("<!doctype html>");
    expect(result.html).toContain("localStorage");
    expect(result.html).toContain("Create a new item");
    expect(result.html).toContain("addEventListener");
    expect(result.files.some((file) => file.path === "index.html")).toBe(true);
    expect(result.checks.every((check) => check.status === "passed")).toBe(true);
    expect(result.html).not.toContain("<script src=");

    const script = result.html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeTruthy();
    expect(() => new Function(script!)).not.toThrow();
  });
});
