import Link from "next/link";
import { redirect } from "next/navigation";

import { getCommunityReviewWorkspace } from "@/lib/community/review-workspace";
import "../community.css";
import "./review.css";

export const dynamic = "force-dynamic";

function formatRole(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CommunityReviewPage() {
  const workspace = await getCommunityReviewWorkspace();

  if (workspace.access.state === "signed_out") {
    redirect("/auth/sign-in");
  }

  if (workspace.access.state === "identity_unverified") {
    return (
      <main className="zlife-landing zlife-review-page">
        <header className="zlife-nav">
          <Link href="/" className="zlife-brand" aria-label="Z-Life home">
            <span className="zlife-mark" aria-hidden="true">
              <span className="zlife-z">Z</span>
              <span className="zlife-pulse">⌁</span>
              <span className="zlife-life">LIFE</span>
            </span>
            <small>by Ziepher Tech</small>
          </Link>
          <nav aria-label="Community review navigation">
            <Link href="/community">Community</Link>
            <Link href="/">Home</Link>
          </nav>
        </header>

        <section className="zlife-review-shell zlife-review-locked">
          <p className="zlife-eyebrow">MAINTAINER REVIEW · IDENTITY REQUIRED</p>
          <h1>Review workspace locked.</h1>
          <p>
            Your Z-Life session is authenticated, but it is not linked to a
            verified Module Maintainer, Core Contributor, or Core Team identity.
            Pending contribution evidence is not exposed until that identity is
            cryptographically or provider-verified.
          </p>
          <div className="zlife-review-lock-note">
            <strong>No identity guessing.</strong>
            <span>
              Z-Life will not match accounts by display name or inferred email.
              GitHub identity linking is tracked separately before review actions
              can be enabled.
            </span>
          </div>
          <Link className="zlife-secondary" href="/community">
            Return to community
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="zlife-landing zlife-review-page">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home">
          <span className="zlife-mark" aria-hidden="true">
            <span className="zlife-z">Z</span>
            <span className="zlife-pulse">⌁</span>
            <span className="zlife-life">LIFE</span>
          </span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="Community review navigation">
          <Link href="/community">Community</Link>
          <a href="#pending">Pending evidence</a>
        </nav>
      </header>

      <section className="zlife-review-shell">
        <div className="zlife-review-heading">
          <div>
            <p className="zlife-eyebrow">MAINTAINER REVIEW · READ-ONLY GATE</p>
            <h1>Contribution review workspace.</h1>
            <p>
              Signed in as {workspace.access.displayName} · {formatRole(workspace.access.status)}
              {workspace.access.githubLogin ? ` · @${workspace.access.githubLogin}` : ""}.
            </p>
          </div>
          <span className="zlife-review-count">
            {workspace.pending.length} pending
          </span>
        </div>

        <div className="zlife-review-safety">
          <strong>Review mutations remain disabled.</strong>
          <span>
            This workspace exposes pending evidence only to an already verified
            maintainer identity. Verify/Reject actions stay unavailable until the
            authenticated Z-Life ↔ GitHub identity-linking path is completed and
            covered by authorization tests.
          </span>
        </div>
      </section>

      <section id="pending" className="zlife-section zlife-review-section">
        <div className="zlife-section-heading">
          <div>
            <p className="zlife-kicker">PENDING EVIDENCE</p>
            <h2>Inspect the work before assigning value.</h2>
            <p>
              Preliminary factors are evidence inputs only. Raw activity and
              commit counts do not become verified contribution value without an
              audited maintainer decision.
            </p>
          </div>
        </div>

        <div className="zlife-review-list">
          {workspace.pending.length ? (
            workspace.pending.map((item) => (
              <article className="zlife-review-card" key={item.id}>
                <div className="zlife-review-card-head">
                  <div>
                    <p>{item.moduleName ?? "Platform / unassigned module"}</p>
                    <h3>{item.description}</h3>
                  </div>
                  <span>{item.contributionType.replaceAll("_", " ")}</span>
                </div>

                <dl className="zlife-review-meta">
                  <div>
                    <dt>Contributor</dt>
                    <dd>
                      {item.contributorLabel}
                      {item.githubLogin ? ` (@${item.githubLogin})` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Repository</dt>
                    <dd>{item.repository}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{item.source}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDate(item.createdAt)}</dd>
                  </div>
                </dl>

                <div className="zlife-review-factors" aria-label="Preliminary scoring factors">
                  <span>Impact <strong>{item.preliminaryFactors.impact}</strong></span>
                  <span>Difficulty <strong>{item.preliminaryFactors.difficulty}</strong></span>
                  <span>Scope <strong>{item.preliminaryFactors.scope}</strong></span>
                  <span>Maintenance <strong>{item.preliminaryFactors.maintenance}</strong></span>
                  <span>Quality <strong>{item.preliminaryFactors.quality}</strong></span>
                </div>

                <div className="zlife-review-actions">
                  {item.sourceUrl ? (
                    <a
                      className="zlife-secondary"
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source evidence
                    </a>
                  ) : (
                    <span className="zlife-review-no-link">No verified source URL</span>
                  )}
                  <button type="button" disabled title="Identity-linked audited review actions are not enabled yet.">
                    Verify disabled
                  </button>
                  <button type="button" disabled title="Identity-linked audited review actions are not enabled yet.">
                    Reject disabled
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="zlife-community-empty-card">
              <h3>No pending contribution evidence.</h3>
              <p>New unverified ledger events will appear here for authorized maintainers.</p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
