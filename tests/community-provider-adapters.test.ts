import { describe, expect, it, vi } from "vitest";

import {
  assertZLifeLiveProviderAllowed,
  runZLifeProviderAction,
  type ZLifeDevelopmentMock,
} from "../lib/community/provider-adapters";
import type { ZLifeMockCapability } from "../lib/community/dev-mode";

const capabilities: ZLifeMockCapability[] = [
  "ai",
  "email",
  "sms",
  "payments",
  "notifications",
];

describe("ZLife provider adapters", () => {
  it.each(capabilities)(
    "never executes the live %s provider when its development mock is active",
    async (capability) => {
      const live = vi.fn(async () => ({ sent: true }));
      const env = {
        ZLIFE_DEV_MODE: "true",
        [`ZLIFE_MOCK_${capability === "payments" ? "PAYMENTS" : capability.toUpperCase()}`]: "true",
      };

      const result = await runZLifeProviderAction({
        capability,
        operation: "test-action",
        payload: { id: "same-input" },
        liveProvider: "real-provider",
        live,
        env,
      });

      expect(live).not.toHaveBeenCalled();
      expect(result.mode).toBe("mock");
      expect(result.provider).toBe("zlife-development-mock");
      expect(result.developmentData).toBe(true);

      const data = result.data as ZLifeDevelopmentMock;
      expect(data.externalRequestSent).toBe(false);
      expect(data.note).toContain("Development data only");
    },
  );

  it("keeps production behavior unchanged when only a stray mock flag exists", async () => {
    const live = vi.fn(async () => ({ sent: true }));

    const result = await runZLifeProviderAction({
      capability: "email",
      operation: "send",
      liveProvider: "real-email-provider",
      live,
      env: {
        ZLIFE_DEV_MODE: "false",
        ZLIFE_MOCK_EMAIL: "true",
      },
    });

    expect(live).toHaveBeenCalledOnce();
    expect(result.mode).toBe("live");
    expect(result.developmentData).toBe(false);
    expect(result.data).toEqual({ sent: true });
  });

  it("produces deterministic development mock identifiers", async () => {
    const input = {
      capability: "sms" as const,
      operation: "send",
      payload: { to: "+15555550100", body: "hello" },
      liveProvider: "real-sms-provider",
      live: vi.fn(async () => ({ sent: true })),
      env: {
        ZLIFE_DEV_MODE: "true",
        ZLIFE_MOCK_SMS: "true",
      },
    };

    const first = await runZLifeProviderAction(input);
    const second = await runZLifeProviderAction(input);

    expect((first.data as ZLifeDevelopmentMock).mockId).toBe(
      (second.data as ZLifeDevelopmentMock).mockId,
    );
  });

  it("blocks direct low-level live provider access while a mock is active", () => {
    expect(() =>
      assertZLifeLiveProviderAllowed("payments", {
        ZLIFE_DEV_MODE: "true",
        ZLIFE_MOCK_PAYMENTS: "true",
      }),
    ).toThrow("blocked by ZLife development mock mode");
  });
});
