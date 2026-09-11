import { randomBytes, timingSafeEqual } from "node:crypto";

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function oauthStateMatches(expected: string | undefined, received: string | null) {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
