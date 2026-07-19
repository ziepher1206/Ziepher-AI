import path from "node:path";
import type { BuildArtifact } from "@/lib/ai/build-types";

const forbiddenContent: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\bsk_live_[A-Za-z0-9]+/i,
    reason: "A live Stripe secret key appeared in generated source."
  },
  {
    pattern: /\b(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\b/,
    reason: "A Supabase service-role credential reference appeared in app source."
  },
  {
    pattern: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
    reason: "A private key appeared in generated source."
  }
];

const financialSignals = [
  /from\s+["']stripe["']/,
  /new\s+Stripe\s*\(/,
  /checkout\.sessions\.create/,
  /paymentIntents\.create/,
  /transfers\.create/
];

export function validateGeneratedArtifact(artifact: BuildArtifact) {
  let bytes = Buffer.byteLength(artifact.previewHtml, "utf8");

  for (const file of artifact.files) {
    const normalized = path.posix.normalize(file.path);
    if (
      normalized.startsWith("../") ||
      normalized.startsWith("/") ||
      normalized.includes("\\")
    ) {
      throw new Error(`Unsafe generated path: ${file.path}`);
    }

    bytes += Buffer.byteLength(file.content, "utf8");
    for (const rule of forbiddenContent) {
      if (rule.pattern.test(file.content)) throw new Error(rule.reason);
    }
  }

  if (bytes > 8_000_000) {
    throw new Error("Generated project exceeds the 8 MB source limit.");
  }

  const containsFinancialImplementation = artifact.files.some((file) =>
    financialSignals.some((pattern) => pattern.test(file.content))
  );
  if (containsFinancialImplementation) {
    throw new Error(
      "Financial integrations must be added in the final build stage, not the core build."
    );
  }
}
