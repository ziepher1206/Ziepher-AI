"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function normalizeDomain(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return trimmed;
  }
}

export function SiteOnboardingForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const normalizedDomain = normalizeDomain(domain);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: businessName.trim(),
          businessName: businessName.trim(),
          domain: normalizedDomain,
          idea: `Improve and manage the existing business website at ${normalizedDomain}. Preserve the business identity, important URLs, customer intent, and working functionality while improving design, mobile usability, accessibility, SEO, conversion paths, copy, and technical quality.`
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to add website.");
      }

      const projectId = payload?.project?.id;
      if (!projectId) throw new Error("Website was created without a project id.");

      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add website.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit} style={{ maxWidth: 560 }}>
      <div>
        <p className="panel-label">Add a business website</p>
        <h2 style={{ marginTop: 6 }}>Start with the website that already exists</h2>
        <p className="auth-copy">
          Z-Life Build uses this domain as the source website. Nothing is published automatically.
        </p>
      </div>

      <label>
        Business name
        <input
          type="text"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          minLength={2}
          maxLength={100}
          placeholder="Family Tree Service"
          required
        />
      </label>

      <label>
        Existing domain
        <input
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="family-tree-service.com"
          required
        />
      </label>

      {error ? <div className="auth-message">{error}</div> : null}

      <button className="button primary auth-submit" disabled={busy}>
        {busy ? "Adding website…" : "Add website"}
      </button>
    </form>
  );
}
