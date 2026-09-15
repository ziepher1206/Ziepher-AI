"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Price = { amount: string; currency: string | null } | null;
type Suggestion = {
  domain: string;
  available: boolean | null;
  purchasePrice: Price;
  renewalPrice: Price;
  years: number | null;
  recommended: boolean;
};

type Payload = {
  project: {
    name: string;
    currentDomain: string | null;
    currentVersion: number;
  };
  provider: "vercel";
  providerConfigured: boolean;
  checkedAt: string | null;
  suggestions: Suggestion[];
};

function priceLabel(price: Price) {
  if (!price) return "Price unavailable";
  return price.currency ? `${price.amount} ${price.currency}` : price.amount;
}

export function ProjectDomainStep({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/domains/suggestions`, {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to check domains.");
      setData(payload as Payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to check domains.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function continueAtVercel(domain: string) {
    setCopied(domain);
    void navigator.clipboard?.writeText(domain).catch(() => undefined);
    window.open("https://vercel.com/domains", "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <section className="project-card">
        <p className="panel-label">Domain</p>
        <h2>Finding names that match your project…</h2>
        <p>Z-Life is checking availability and current registrar pricing when your connected Vercel account allows it.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="project-card" style={{ display: "grid", gap: 12 }}>
        <p className="panel-label">Domain check needs attention</p>
        <h2>We could not refresh live domain results.</h2>
        <p>{error}</p>
        <div><button className="button" onClick={() => void load()}>Try again</button></div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      {data.project.currentDomain ? (
        <section className="project-card">
          <p className="panel-label">Current domain</p>
          <h2>{data.project.currentDomain}</h2>
          <p>You can keep this domain or choose a new one below.</p>
        </section>
      ) : null}

      {!data.providerConfigured ? (
        <section className="project-card" style={{ display: "grid", gap: 12 }}>
          <p className="panel-label">Live pricing connection</p>
          <h2>Connect Vercel to check live availability and prices.</h2>
          <p>
            Z-Life generated matching names below, but it will not pretend they are available or show made-up pricing. Connect Vercel and refresh to get current registrar results.
          </p>
          <div className="inline-actions">
            <Link className="button primary" href="/settings/connections">Connect Vercel</Link>
            <button className="button" onClick={() => void load()}>Refresh</button>
          </div>
        </section>
      ) : null}

      <div className="project-grid" style={{ marginTop: 0 }}>
        {data.suggestions.map((suggestion) => (
          <article
            className="project-card"
            key={suggestion.domain}
            style={{ display: "grid", gap: 12 }}
          >
            <div className="project-card-top">
              <span className={`status-pill ${suggestion.available ? "free" : ""}`}>
                {suggestion.available === true
                  ? "Available"
                  : suggestion.available === false
                    ? "Taken"
                    : "Not checked"}
              </span>
              {suggestion.recommended ? <span className="status-pill">Recommended</span> : null}
            </div>
            <div>
              <h2 style={{ marginBottom: 6 }}>{suggestion.domain}</h2>
              {suggestion.available ? (
                <div style={{ display: "grid", gap: 4 }}>
                  <span><strong>First registration:</strong> {priceLabel(suggestion.purchasePrice)}</span>
                  <span><strong>Renewal:</strong> {priceLabel(suggestion.renewalPrice)}</span>
                  {suggestion.years ? <small>Provider term: {suggestion.years} year{suggestion.years === 1 ? "" : "s"}</small> : null}
                </div>
              ) : suggestion.available === false ? (
                <p>Z-Life will keep showing alternatives instead of stopping here.</p>
              ) : (
                <p>Connect the registrar rail to check this name live.</p>
              )}
            </div>
            {suggestion.available ? (
              <button className="button primary" type="button" onClick={() => continueAtVercel(suggestion.domain)}>
                Continue to Buy
              </button>
            ) : null}
            {copied === suggestion.domain ? (
              <small>{suggestion.domain} copied. Vercel Domains opened in a new tab. No purchase was made by Z-Life.</small>
            ) : null}
          </article>
        ))}
      </div>

      <section className="project-card" style={{ display: "grid", gap: 12 }}>
        <p className="panel-label">Already own a domain?</p>
        <h2>Keep it and connect it to this project.</h2>
        <p>The domain purchase step is optional. Z-Life will never buy a domain or change DNS without an explicit action from you.</p>
        <div className="inline-actions">
          <Link className="button" href={`/projects/${projectId}/settings/deployment`}>Use my existing domain</Link>
          <Link className="button" href={`/projects/${projectId}/studio`}>Back to preview</Link>
        </div>
      </section>

      {data.checkedAt ? (
        <small>Live provider results checked {new Date(data.checkedAt).toLocaleString()}. Prices can change before checkout.</small>
      ) : null}
    </section>
  );
}
