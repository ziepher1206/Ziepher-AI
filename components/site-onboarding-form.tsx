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
  const [kind, setKind] = useState<"website" | "app">("website");
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [hasExistingSite, setHasExistingSite] = useState(false);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const normalizedDomain = hasExistingSite ? normalizeDomain(domain) : "";
      if (hasExistingSite && !normalizedDomain) throw new Error("Enter the existing website domain.");

      const coreIdea = idea.trim() || `Create a professional ${kind} for ${name.trim()}.`;
      const requestBody = hasExistingSite
        ? {
            name: name.trim(),
            businessName: name.trim(),
            domain: normalizedDomain,
            idea: `${coreIdea}\n\nUse ${normalizedDomain} as an existing source. Preserve important business identity and working content while improving visual quality, mobile usability, accessibility, SEO, conversion paths, and technical quality.`
          }
        : {
            name: name.trim(),
            idea: `${coreIdea}\n\nProject type: ${kind}. Build from the user's instructions and uploaded references. Do not publish without approval.`
          };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Unable to start this project.");

      const projectId = payload?.project?.id;
      if (!projectId) throw new Error("Project was created without an id.");

      router.push(`/projects/${projectId}/media`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start this project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit} style={{ maxWidth: 680 }}>
      <div>
        <p className="panel-label">Step 1 of 5 · Build</p>
        <h2 style={{ marginTop: 6 }}>What do you want Z-Life to build?</h2>
        <p className="auth-copy">Keep it simple. Start with the type, name, and a short description. Photos, screenshots, logos, and design references come next.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button className={`button ${kind === "website" ? "primary" : ""}`} type="button" onClick={() => setKind("website")} aria-pressed={kind === "website"}>
          Website
        </button>
        <button className={`button ${kind === "app" ? "primary" : ""}`} type="button" onClick={() => setKind("app")} aria-pressed={kind === "app"}>
          App
        </button>
      </div>

      <label>
        Project or business name
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} placeholder="Family Tree Service" required />
      </label>

      <label>
        What should it do or look like?
        <textarea value={idea} onChange={(event) => setIdea(event.target.value)} rows={5} placeholder="Tell Z-Life what you want in plain English. You can keep this short and add visual references next." />
      </label>

      {kind === "website" ? (
        <label style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <input type="checkbox" checked={hasExistingSite} onChange={(event) => setHasExistingSite(event.target.checked)} style={{ width: 16, height: 16 }} />
          I already have a website I want Z-Life to improve
        </label>
      ) : null}

      {kind === "website" && hasExistingSite ? (
        <label>
          Existing domain
          <input type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="family-tree-service.com" required />
        </label>
      ) : null}

      <div className="project-card" style={{ padding: 12 }}>
        <small>Starting the project only saves your setup. It does not call paid AI, publish anything, buy a domain, or change DNS.</small>
      </div>

      {error ? <div className="auth-message">{error}</div> : null}

      <button className="button primary auth-submit" disabled={busy}>
        {busy ? "Starting…" : "Continue to Step 2 · Photos & References →"}
      </button>
    </form>
  );
}
