"use client";

import { useEffect, useState } from "react";

type BillingStatus = {
  enabled: boolean;
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  };
  credits: {
    balance: number;
    reserved: number;
  };
};

export function BillingControls() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetch("/api/billing/status", { cache: "no-store" })
        .then(async (response) => {
          const payload = (await response.json()) as BillingStatus & {
            error?: string;
          };
          if (!response.ok) throw new Error(payload.error ?? "Unable to load billing.");
          setStatus(payload);
        })
        .catch((error: unknown) => {
          setMessage(
            error instanceof Error ? error.message : "Unable to load billing."
          );
        });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  async function post(url: string, body?: unknown) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Billing request failed.");
      }
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Billing request failed."
      );
      setBusy(false);
    }
  }

  return (
    <section className="billing-shell">
      <div className="billing-summary">
        <div>
          <span className="panel-label">Current plan</span>
          <strong>{status?.subscription.plan ?? "Loading…"}</strong>
          <small>{status?.subscription.status ?? "Checking billing"}</small>
        </div>
        <div>
          <span className="panel-label">Build credits</span>
          <strong>{status?.credits.balance ?? "—"}</strong>
          <small>{status?.credits.reserved ?? 0} currently reserved</small>
        </div>
      </div>

      {!status?.enabled ? (
        <div className="billing-disabled">
          Stripe is correctly disabled. Enable it only after test-mode products,
          webhook delivery, refunds, cancellations, and security gates are
          verified.
        </div>
      ) : null}

      <div className="pricing-grid">
        <article>
          <span className="status-pill free">Free</span>
          <h2>Explore</h2>
          <p>Unlimited planning within fair-use limits and introductory builds.</p>
          <strong>$0</strong>
          <button className="button" disabled>
            Current free access
          </button>
        </article>

        <article>
          <span className="status-pill">Builder</span>
          <h2>Builder</h2>
          <p>Private projects, source export, version history, and 400 monthly credits.</p>
          <strong>$19/mo</strong>
          <button
            className="button primary"
            disabled={busy || !status?.enabled}
            onClick={() =>
              post("/api/billing/checkout", {
                plan: "builder",
                interval: "monthly"
              })
            }
          >
            Choose Builder
          </button>
        </article>

        <article className="pricing-featured">
          <span className="status-pill free">Recommended</span>
          <h2>Pro</h2>
          <p>Stronger AI routing, advanced tests, priority builds, and 1,000 monthly credits.</p>
          <strong>$39/mo</strong>
          <button
            className="button primary"
            disabled={busy || !status?.enabled}
            onClick={() =>
              post("/api/billing/checkout", {
                plan: "pro",
                interval: "monthly"
              })
            }
          >
            Choose Pro
          </button>
        </article>
      </div>

      <button
        className="button"
        disabled={busy || !status?.enabled}
        onClick={() => post("/api/billing/portal")}
      >
        Manage subscription
      </button>

      {message ? <div className="auth-message">{message}</div> : null}
    </section>
  );
}
