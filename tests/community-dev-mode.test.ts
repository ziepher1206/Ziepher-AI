import { describe, expect, it } from "vitest";

import {
  getZLifeDevModeState,
  isZLifeDevMode,
  shouldUseZLifeMock,
} from "../lib/community/dev-mode";

describe("ZLife community dev mode", () => {
  it("stays disabled unless explicitly enabled", () => {
    expect(isZLifeDevMode({})).toBe(false);
    expect(shouldUseZLifeMock("ai", { ZLIFE_MOCK_AI: "true" })).toBe(false);
  });

  it("enables only explicitly selected mocks behind dev mode", () => {
    const env = {
      ZLIFE_DEV_MODE: "true",
      ZLIFE_MOCK_AI: "true",
      ZLIFE_MOCK_EMAIL: "false",
      ZLIFE_MOCK_SMS: "true",
    } as NodeJS.ProcessEnv;

    expect(shouldUseZLifeMock("ai", env)).toBe(true);
    expect(shouldUseZLifeMock("email", env)).toBe(false);
    expect(shouldUseZLifeMock("sms", env)).toBe(true);
  });

  it("reports a safe consolidated state", () => {
    const state = getZLifeDevModeState({
      ZLIFE_DEV_MODE: "true",
      ZLIFE_MOCK_AI: "true",
      ZLIFE_MOCK_EMAIL: "true",
      ZLIFE_MOCK_SMS: "true",
      ZLIFE_MOCK_PAYMENTS: "true",
      ZLIFE_MOCK_NOTIFICATIONS: "true",
    } as NodeJS.ProcessEnv);

    expect(state.enabled).toBe(true);
    expect(Object.values(state.mocks).every(Boolean)).toBe(true);
  });
});
