"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

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
  build_job_id: string | null;
  source_control_run_id: string | null;
  preview_url: string | null;
  published_at: string | null;
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
  buildExecutionEnabled: boolean;
};

const refinementExamples = [
  "Make the hero taller and more dramatic.",
  "Use my third uploaded photo in the hero.",
  "Match my reference screenshot more closely.",
  "Make the mobile version cleaner and easier to scan.",
  "Give this section more detail and stronger graphics.",
  "Keep the layout, but make the call to action stand out more."
];

function titleFromInstructions(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return "Refine preview";
  const sentence = clean.split(/[.!?]/)[0]?.trim() || clean;
  return sentence.slice(0, 157) || "Refine preview";
}

function statusCopy(row: ChangeRequest) {
  if (row.status === "awaiting_ai_approval") return "Saved — waiting for your AI approval";
  if (row.status === "ready_for_ai") return "Approved — ready to prepare refinement";
  if (row.status === "generating") return "Preparing refinement";
  if (row.status === "proposal_ready") return "Refinement ready for preview build";
  if (row.status === "build_queued") return "Preview build queued";
  if (row.status === "preview_ready") return "New preview ready";
  if (row.status === "failed") return "Needs attention";
  return row.status.replaceAll("_", " ");
}

export function SiteChangeRequestWorkflow({
  projectId,
  rows,
  initialSourceType = "manual",
  initialSourceReference = "",
  initialInstructions = "",
  initialTitle = "",
  aiGenerationEnabled,
  buildExecutionEnabled
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const newest = useMemo(() => rows[0] ?? null, [rows]);

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    const cleanInstructions = instructions.trim();
    if (cleanInstructions.length < 10) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/change-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || titleFromInstructions(cleanInstructions),
          instructions: cleanInstructions,
          sourceType: initialSourceType,
          sourceReference: initialSourceReference || null
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save refinement.");
      setTitle("");
      setInstructions("");
      setMessage("Refinement saved. Nothing was changed or published yet.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save refinement.");
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
      setMessage("AI approval recorded. No provider call was made by this approval step.");
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
      if (!response.ok) throw new Error(payload.error ?? "Unable to prepare refinement.");
      setMessage("Refinement prepared for review. Nothing was published.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to prepare refinement.");
    } finally {
      setWorkingId(null);
    }
  }

  async function queueBuild(requestId: string) {
    setWorkingId(requestId);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-requests/${requestId}/queue-build`,
        { method: "POST" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to build refinement preview.");
      setMessage("A new preview build is queued. The live website has not been changed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to build refinement preview.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section style={{ display: "grid", gap: 22 }}>
      <form
        className="project-card"
        onSubmit={createRequest}
        style={{
          display: "grid",
          gap: 16,
          padding: "clamp(18px, 3vw, 30px)",
          borderColor: "rgba(127,255,212,.28)",
          boxShadow: "0 22px 70px rgba(0,0,0,.18)"
        }}
      >
        <div>
          <p className="panel-label">Refine this build</p>
          <h2 style={{ margin: "7px 0 8px", fontSize: "clamp(24px,4vw,38px)" }}>
            What would you like Z-Life to change?
          </h2>
          <p className="auth-copy" style={{ maxWidth: 760 }}>
            Describe the change normally. You do not need to know code, CSS, hosting, or where the setting lives.
          </p>
        </div>

        <textarea
          className="input"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Example: Keep the design, but make the hero taller, use my third photo on the right, and make the call-to-action much easier to see on mobile."
          minLength={10}
          maxLength={12000}
          rows={7}
          required
          aria-label="Tell Z-Life what to change"
          style={{ fontSize: 16, lineHeight: 1.55, minHeight: 150 }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} aria-label="Refinement examples">
          {refinementExamples.map((example) => (
            <button
              className="button compact"
              type="button"
              key={example}
              onClick={() =>
                setInstructions((current) =>
                  current.trim() ? `${current.trim()} ${example}` : example
                )
              }
            >
              {example}
            </button>
          ))}
        </div>

        <details>
          <summary style={{ cursor: "pointer" }}>Optional: name this change</summary>
          <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <span>Change name</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Z-Life will name it automatically if left blank"
              maxLength={160}
            />
          </label>
        </details>

        <div className="inline-actions" style={{ alignItems: "center" }}>
          <button className="button primary" disabled={submitting || instructions.trim().length < 10} type="submit">
            {submitting ? "Saving…" : "Save this refinement"}
          </button>
          <Link className="button" href={`/projects/${projectId}/studio`}>
            Back to preview
          </Link>
          <span className="status-pill">Saving does not publish</span>
        </div>
      </form>

      {message ? (
        <section className="project-card" style={{ borderColor: "rgba(127,255,212,.24)" }}>
          <p style={{ margin: 0 }}>{message}</p>
        </section>
      ) : null}

      {newest ? (
        <section className="project-card" style={{ display: "grid", gap: 14 }}>
          <div className="project-card-top">
            <div>
              <p className="panel-label">Latest refinement</p>
              <h2 style={{ margin: "5px 0 7px" }}>{newest.title}</h2>
            </div>
            <span className="status-pill">{statusCopy(newest)}</span>
          </div>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{newest.instructions}</p>
          <div className="inline-actions">
            {!newest.ai_generation_approved && newest.status === "awaiting_ai_approval" ? (
              <button
                className="button primary"
                disabled={workingId === newest.id}
                onClick={() => approveAI(newest.id)}
                type="button"
              >
                Approve AI for this refinement
              </button>
            ) : null}

            {newest.status === "ready_for_ai" ? (
              aiGenerationEnabled ? (
                <button
                  className="button primary"
                  disabled={workingId === newest.id}
                  onClick={() => generateProposal(newest.id)}
                  type="button"
                >
                  Prepare refinement
                </button>
              ) : (
                <span className="status-pill">AI provider calls are currently locked</span>
              )
            ) : null}

            {newest.status === "proposal_ready" ? (
              buildExecutionEnabled ? (
                <button
                  className="button primary"
                  disabled={workingId === newest.id}
                  onClick={() => queueBuild(newest.id)}
                  type="button"
                >
                  Build new preview
                </button>
              ) : (
                <span className="status-pill">Build provider usage is currently locked</span>
              )
            ) : null}

            {newest.preview_url ? (
              <a className="button primary" href={newest.preview_url} target="_blank" rel="noreferrer">
                Open new preview
              </a>
            ) : null}
            <Link className="button" href={`/projects/${projectId}/studio`}>
              Return to studio
            </Link>
          </div>
          <small>
            AI generation, preview build, and production release remain separate actions so nothing goes live unexpectedly.
          </small>
        </section>
      ) : null}

      {rows.length > 1 ? (
        <details className="project-card">
          <summary style={{ cursor: "pointer" }}>Previous refinements ({rows.length - 1})</summary>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {rows.slice(1).map((row) => (
              <article key={row.id} style={{ display: "grid", gap: 7, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.09)" }}>
                <div className="project-card-top">
                  <strong>{row.title}</strong>
                  <span className="status-pill">{statusCopy(row)}</span>
                </div>
                <p style={{ margin: 0 }}>{row.instructions}</p>
                <small>{new Date(row.created_at).toLocaleString()}</small>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
