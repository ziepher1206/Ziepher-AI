import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decryptProviderSecret, encryptProviderSecret } from "../lib/security/provider-credentials";

const key = Buffer.alloc(32, 7).toString("base64");

describe("provider credential encryption", () => {
  beforeEach(() => { process.env.ZIEPHER_PROVIDER_CREDENTIALS_KEY = key; });
  afterEach(() => { delete process.env.ZIEPHER_PROVIDER_CREDENTIALS_KEY; });

  it("round-trips a secret without storing plaintext", () => {
    const encrypted = encryptProviderSecret("github-token-value");
    expect(encrypted.ciphertext).not.toContain("github-token-value");
    expect(decryptProviderSecret(encrypted)).toBe("github-token-value");
  });

  it("fails closed with an invalid key", () => {
    process.env.ZIEPHER_PROVIDER_CREDENTIALS_KEY = Buffer.alloc(31).toString("base64");
    expect(() => encryptProviderSecret("x")).toThrow("32 bytes");
  });

  it("detects tampering", () => {
    const encrypted = encryptProviderSecret("secret");
    encrypted.ciphertext = Buffer.from("tampered").toString("base64");
    expect(() => decryptProviderSecret(encrypted)).toThrow();
  });
});
