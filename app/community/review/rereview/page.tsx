import Link from "next/link";
import { redirect } from "next/navigation";

import { ZLifeHeartbeat } from "@/components/zlife-heartbeat";
import { getCommunityReviewWorkspace } from "@/lib/community/review-workspace";
import "../../community.css";
import "../review.css";
import { dismissRereviewRequestAction, resolveRereviewRequestAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CommunityRereviewPage() {
  const workspace = await getCommunityReviewWorkspace();

  if (workspace.access.state === "signed_out") redirect("/auth/sign-in");

  if (workspace.access.state !== "authorized") {
    return (
      <main className="zlife-landing zlife-review-page">
        <section className="zlife-review-shell zlife-review-locked">
          <p className="zlife-eyebrow">RE-REVIEW QUEUE · VERIFIED MAINTAINERS ONLY</p>
          <h1>Re-review workspace locked.</h1>
          <p>Your authenticated ZLife identity is not authorized to resolve contributor review disputes.</p>
          <Link className="zlife-secondary" href="/community/review">Back to review workspace</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="zlife-landing zlife-review-page">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home">
          <span className="zlife-mark" aria-hidden="true">
            <span className="zlife-z">Z</span><ZLifeHeartbeat /><span className="zlife-life">LIFE</span>
          </span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="Re-review navigation">
          <Link href="/community/review">Contribution review</Link>
          <Link href="/community">Community</Link>
        </nav>
      </header>

      <section className="zlife-review-shell">
        <div className="zlife-review-heading">
          <div>
            <p className="zlife-eyebrow">AUDITED RE-REVIEW QUEUE</p>
            <h1>Resolve contributor review requests.</h1>
            <p>These requests ask for a second look at an existing verified or rejected decision. Resolving this queue does not automatically change the original score or contribution status.</p>
          </div>
          <span className="zlife-review-count">{workspace.rereviewRequests.length} open</span>
        </div>
      </section>

      <section className="zlife-section zlife-review-section">
        <div className="zlife-review-list">
          {workspace.rereviewRequests.length ? workspace.rereviewRequests.map((request) => (
            <article className="zlife-review-card" key={request.id}>
              <div className="zlife-review-card-head">
                <div>
                  <p>{request.contributorLabel}</p>
                  <h3>Request to reconsider a {request.originalAction} decision</h3>
                </div>
                <span>{new Date(request.createdAt).toLocaleDateString()}</span>
              </div>

              <dl className="zlife-review-meta">
                <div>
                  <dt>Original decision</dt>
                  <dd>{request.originalAction}</dd>
                </div>
                <div>
                  <dt>Original verified score</dt>
                  <dd>{request.originalVerifiedScore ?? "None"}</dd>
                </div>
              </dl>

              <div className="zlife-review-safety">
                <strong>Original reviewer reason</strong>
                <span>{request.originalReason}</span>
              </div>
              <div className="zlife-review-safety">
                <strong>Contributor re-review reason</strong>
                <span>{request.requestReason}</span>
              </div>

              <form action={resolveRereviewRequestAction} style={{ marginTop: 16 }}>
                <input type="hidden" name="requestId" value={request.id} />
                <label>
                  Resolution explanation
                  <textarea name="resolution" minLength={10} maxLength={2000} rows={4} required placeholder="Explain the second-review outcome and what, if anything, should happen next." />
                </label>
                <div className="zlife-hero-actions" style={{ marginTop: 12 }}>
                  <button className="zlife-primary" type="submit">Resolve request</button>
                  <button className="zlife-secondary" type="submit" formAction={dismissRereviewRequestAction}>Dismiss request</button>
                </div>
              </form>
            </article>
          )) : (
            <article className="zlife-community-empty-card">
              <h3>No open re-review requests.</h3>
              <p>Contributor appeals will appear here after they are submitted from ZLife Studio.</p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
