"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ACCEPTANCE_KEY = "zlife.contributor-rules.accepted.v1";

export function ContributorJoinClient() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  function enterStudio() {
    if (!accepted) return;
    window.localStorage.setItem(ACCEPTANCE_KEY, new Date().toISOString());
    router.push("/community/studio");
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <section className="auth-card" style={{ maxWidth: "none" }}>
        <p className="panel-label">Contributor rules</p>
        <h2 style={{ margin: "6px 0 12px" }}>Build freely. Protect the platform.</h2>
        <div className="auth-copy" style={{ display: "grid", gap: 10 }}>
          <p>Use sandbox, fork, branch, mock-data, and development environments only unless Ziepher Tech explicitly grants a different level of access.</p>
          <p>Never submit production credentials, customer data, payment details, private keys, session tokens, or confidential information.</p>
          <p>All work must pass review, CI, security checks, and visual workflow testing before it can be considered for ZLife.</p>
          <p>Contribution value is based on verified impact, quality, adoption, reliability, and usefulness—not raw commits, hours, or popularity.</p>
          <p>Contributor status does not automatically create employment, partnership, equity, ownership, or a guaranteed payout. Any paid reward or revenue-share program must be explicitly active and governed by its published terms.</p>
        </div>
      </section>

      <section className="project-card" style={{ minHeight: 0 }}>
        <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            aria-label="Accept ZLife contributor rules"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            type="checkbox"
            style={{ width: 20, height: 20, marginTop: 2 }}
          />
          <span>
            <strong>I accept the ZLife contributor rules.</strong><br />
            <span className="auth-copy">I understand that public contribution happens inside controlled environments and that acceptance does not grant production access.</span>
          </span>
        </label>

        <div className="zlife-hero-actions" style={{ marginTop: 20 }}>
          <button className="zlife-primary" type="button" disabled={!accepted} onClick={enterStudio} style={{ opacity: accepted ? 1 : 0.45 }}>
            Accept & Enter ZLife Studio <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
