"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ChangeRequest = {
  id: string;
  source_type: string;
  source_reference: string | null;
  title: string;
  instructions: string;
  status: string;
  ai_generation_approved: boolean;
  ai_generation_approved_at: string | null;
  spec_version_id: string | null;
  preview_url: string | null;
  created_at: string;
};

type Props = {
  projectId: string;
  rows: ChangeRequest[];
  initialSourceType?: "manual" | "scan_recommendation" | "campaign";
  initialSourceReference?: string;
  initialInstructions?: string;
  initialTitle?: string;
  aiGenerationEnabled: boolean;
};

export function SiteChangeRequestWorkflow({
  projectId,
  rows,
  initialSourceType = "manual",
  initialSourceReference = "",
  initialInstructions = "",
  initialTitle = "",
  aiGenerationEnabled
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/change-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          instructions,
          sourceType: initialSourceType,
          sourceReference: initialSourceReference || null
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save change request.");
      setTitle("");
      setInstructions("");
      setMessage("Change request saved. No AI or publishing action was started.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save change request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function approveAI(requestId: string) {
    setWorkingId(requestId);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-requests/${requestId}/approve-ai`,
        { method: "POST" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to record approval.");
      setMessage("AI-generation approval recorded. This did not make a provider call.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record approval.");
    } finally {
      setWorkingId(null);
    }
  }

  async function generateProposal(requestId: string) {
    setWorkingId(requestId);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-requests/${requestId}/generate`,
        { method: "POST" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to generate proposal.");
      setMessage("Proposal generated and saved for review. Nothing was published.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate proposal.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section style={{ display: "grid", gap: 24 }}>
      <form className="project-card" onSubmit={createRequest} style={{ display: "grid", gap: 14 }}>
        <div>
          <p className="panel-label">New change request</p>
          <h2 style={{ marginBottom: 8 }}>Tell SiteRefiner what should change</h2>
          <p className="auth-copy">
            Saving this request is free and does not call an AI provider, modify the website, or publish anything.
          </p>
        </div>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Change title</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Improve the homepage call to action"
            minLength={3}
            maxLength={160}
            required
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>What should SiteRefiner do?</span>
          <textarea
            className="input"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Make the main service and phone CTA easier to see on mobile without changing the business branding."
            minLength={10}
            maxLength={12000}
            rows={6}
            required
          />
        </label>
        <div className="inline-actions">
          <button className="button primary" disabled={submitting} type="submit">
            {submitting ? "Saving…" : "Save change request"}
          </button>
          <span className="status-pill">Source: {initialSourceType.replaceAll("_", " ")}</span>
        </div>
      </form>

      {message ? <section className="project-card"><p>{message}</p></section> : null}

      <section>
        <p className="panel-label">Change pipeline</p>
        {rows.length ? (
          <div className="project-grid" style={{ marginTop: 12 }}>
            {rows.map((row) => (
              <article className="project-card" key={row.id} style={{ display: "grid", gap: 12 }}>
                <div className="project-card-top">
                  <span className="status-pill">{row.status.replaceAll("_", " ")}</span>
                  <span className="project-version">{row.source_type.replaceAll("_", " ")}</span>
                </div>
                <div>
                  <h2>{row.title}</h2>
                  <p>{row.instructions}</p>
                </div>
                <small>Created {new Date(row.created_at).toLocaleString()}</small>
                <div className="inline-actions">
                  {!row.ai_generation_approved && row.status === "awaiting_ai_approval" ? (
                    <button
                      className="button"
                      disabled={workingId === row.id}
                      onClick={() => approveAI(row.id)}
                      type="button"
                    >
                      Approve AI generation
                    </button>
                  ) : null}
                  {row.status === "ready_for_ai" ? (
                    aiGenerationEnabled ? (
                      <button
                        className="button primary"
                        disabled={workingId === row.id}
                        onClick={() => generateProposal(row.id)}
                        type="button"
                      >
                        Generate proposal
                      </button>
                    ) : (
                      <span className="status-pill">Provider calls locked by owner</span>
                    )
                  ) : null}
                  {row.spec_version_id ? (
                    <a className="button" href={`/projects/${projectId}/studio`}>
                      Review proposal
                    </a>
                  ) : null}
                  {row.preview_url ? (
                    <a className="button" href={row.preview_url} target="_blank" rel="noreferrer">
                      Open preview
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="empty-projects" style={{ marginTop: 12 }}>
            <h2>No change requests yet</h2>
            <p>Create one manually, or send a scan recommendation or campaign into this pipeline.</p>
          </section>
        )}
      </section>
    </section>
  );
}
