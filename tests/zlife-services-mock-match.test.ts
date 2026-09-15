import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("app/services/mock-match/actions.ts", "utf8");
const page = readFileSync("app/services/mock-match/page.tsx", "utf8");
const env = readFileSync(".env.example", "utf8");

describe("ZLife Services mock Ziepher Match adapter", () => {
  it("is explicitly enabled only in development mock mode", () => {
    expect(env).toContain("ZLIFE_MOCK_MATCH=true");
    expect(actions).toContain('process.env.ZLIFE_DEV_MODE !== "true"');
    expect(actions).toContain('process.env.ZLIFE_MOCK_MATCH !== "true"');
    expect(page).toContain('process.env.ZLIFE_DEV_MODE !== "true"');
    expect(page).toContain('process.env.ZLIFE_MOCK_MATCH !== "true"');
  });

  it("never calls the real marketplace or paid communication/payment providers", () => {
    for (const forbidden of ["fetch(", "axios", "getStripe(", "twilio", "resend", "OPENAI_API_KEY"]) {
      expect(actions.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
    expect(page).toContain("does not make a network call, contact a business, send a message, or confirm a billable event");
  });

  it("keeps mock matching and inspection simulation non-billable", () => {
    expect(actions).toContain('external_provider: "ziepher_match_mock"');
    expect(actions).toContain('status: "matched"');
    expect(actions).toContain('status: "inspection_scheduled"');
    expect(actions.match(/billable_event_confirmed: false/g)?.length).toBeGreaterThanOrEqual(2);
    expect(actions).not.toContain("billable_event_confirmed: true");
  });

  it("cannot take over terminal, real-provider, or already billable requests", () => {
    expect(actions).toContain('["closed", "canceled"].includes(current.status)');
    expect(actions).toContain('current.external_provider !== "ziepher_match_mock"');
    expect(actions).toContain("current.billable_event_confirmed");
    expect(actions).toContain('.eq("workspace_id", workspaceId)');
  });
});
