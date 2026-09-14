import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const consoleSource = readFileSync("components/agent-team-console.tsx", "utf8");
const detailSource = readFileSync("app/team/runs/[runId]/page.tsx", "utf8");

describe("saved ZLife team run history", () => {
  it("links each saved run to a stable detail route", () => {
    expect(consoleSource).toContain('href={`/team/runs/${run.id}`}');
    expect(consoleSource).toContain("Open saved results");
    expect(consoleSource).toContain("Viewing history never reruns the team or consumes provider credits");
  });

  it("requires authentication and scopes the saved run to the current workspace", () => {
    expect(detailSource).toContain('redirect("/auth/sign-in")');
    expect(detailSource).toContain('rpc("ensure_personal_workspace")');
    expect(detailSource).toContain('.from("agent_runs")');
    expect(detailSource).toContain('.eq("id", runId)');
    expect(detailSource).toContain('.eq("workspace_id", workspaceId)');
  });

  it("loads persisted specialist steps in their original sequence", () => {
    expect(detailSource).toContain('.from("agent_run_steps")');
    expect(detailSource).toContain('.eq("run_id", run.id)');
    expect(detailSource).toContain('.order("sequence", { ascending: true })');
    expect(detailSource).toContain("Saved handoff sequence");
    expect(detailSource).toContain("persisted results from this exact run");
  });

  it("shows safety and cost evidence without executing providers", () => {
    expect(detailSource).toContain("provider_cost_usd");
    expect(detailSource).toContain("input_tokens");
    expect(detailSource).toContain("output_tokens");
    expect(detailSource).toContain("customer_usage_usd");
    expect(detailSource).not.toContain("executeLiveAgent");
    expect(detailSource).not.toContain("planWithOpenAI");
    expect(detailSource).not.toContain('fetch("/api/team/runs"');
  });
});
