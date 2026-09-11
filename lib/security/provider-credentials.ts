import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function getKey() {
  const raw = process.env.ZIEPHER_PROVIDER_CREDENTIALS_KEY;
  if (!raw) throw new Error("ZIEPHER_PROVIDER_CREDENTIALS_KEY is not configured.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ZIEPHER_PROVIDER_CREDENTIALS_KEY must decode to 32 bytes.");
  return key;
}

export type EncryptedSecret = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

export function encryptProviderSecret(plaintext: string): EncryptedSecret {
  if (!plaintext) throw new Error("Provider secret cannot be empty.");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: ALGO,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

export function decryptProviderSecret(payload: EncryptedSecret): string {
  if (payload.v !== 1 || payload.alg !== ALGO) throw new Error("Unsupported encrypted secret format.");
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}
