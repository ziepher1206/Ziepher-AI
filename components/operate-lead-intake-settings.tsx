"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Project = { id: string; name: string; primary_domain: string | null; source_domain: string | null };
type Token = {
  id: string;
  token: string;
  label: string;
  allowed_origin: string | null;
  project_id: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type Props = { workspaceId: string; projects: Project[]; tokens: Token[] };

function originFromProject(project: Project | undefined) {
  const domain = project?.primary_domain || project?.source_domain;
  if (!domain) return "";
  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    try { return new URL(domain).origin; } catch { return ""; }
  }
  return `https://${domain.replace(/^\/+|\/+$/g, "")}`;
}

export function OperateLeadIntakeSettings({ workspaceId, projects, tokens }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeTokens = tokens.filter((item) => !item.revoked_at);

  async function createToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const projectId = String(form.get("projectId") ?? "");
    const response = await fetch("/api/operate/leads/intake-tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        projectId: projectId || null,
        label: String(form.get("label") ?? "Website lead form"),
        allowedOrigin: String(form.get("allowedOrigin") ?? "") || null
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body?.error ?? "Unable to create intake token.");
      setBusy(false);
      return;
    }
    event.currentTarget.reset();
    setBusy(false);
    router.refresh();
  }

  async function revokeToken(tokenId: string) {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/operate/leads/intake-tokens", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, tokenId })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body?.error ?? "Unable to revoke intake token.");
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <div>
        <p className="panel-label">Website intake</p>
        <h2 style={{ margin: "6px 0 8px" }}>Connect an estimate-request form</h2>
        <p className="auth-copy" style={{ margin: 0, maxWidth: 820 }}>
          Create a revocable intake token for a website. Restrict it to that website origin when possible. Forms post directly into the same lead inbox and attribution pipeline as manually entered requests.
        </p>
      </div>

      <form onSubmit={createToken} style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <label className="field">
            <span>Website project</span>
            <select name="projectId" defaultValue="" onChange={(event) => {
              const form = event.currentTarget.form;
              const origin = originFromProject(projects.find((project) => project.id === event.currentTarget.value));
              const field = form?.elements.namedItem("allowedOrigin") as HTMLInputElement | null;
              if (field && origin) field.value = origin;
            }}>
              <option value="">No project / generic form</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Label</span>
            <input name="label" defaultValue="Website lead form" maxLength={160} required />
          </label>
          <label className="field">
            <span>Allowed website origin</span>
            <input name="allowedOrigin" placeholder="https://example.com" maxLength={500} />
          </label>
        </div>
        <div><button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Create intake token"}</button></div>
      </form>

      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        {activeTokens.map((item) => {
          const endpoint = `/api/public/operate/leads/${item.token}`;
          return (
            <article key={item.id} className="project-card" style={{ minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{item.label}</strong>
                  <div className="auth-copy" style={{ marginTop: 5, fontSize: 13 }}>{item.allowed_origin || "Any origin"}</div>
                  <div style={{ marginTop: 10, overflowWrap: "anywhere", fontFamily: "monospace", fontSize: 12 }}>{endpoint}</div>
                </div>
                <button className="button" type="button" disabled={busy} onClick={() => revokeToken(item.id)}>Revoke</button>
              </div>
              <p className="auth-copy" style={{ margin: "12px 0 0", fontSize: 13 }}>
                POST JSON fields: submissionId, contactName, email or phone, serviceAddress, message, source, sourceDetail, smsConsent. Generate a fresh UUID for submissionId once per form submission and reuse it on retries.
              </p>
            </article>
          );
        })}
        {!activeTokens.length ? <p className="auth-copy">No active website intake token yet.</p> : null}
      </div>
    </section>
  );
}
