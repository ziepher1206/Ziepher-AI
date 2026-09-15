"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Price = { amount: string; currency: string | null } | null;
type Suggestion = {
  domain: string;
  available: boolean | null;
  purchasePrice: Price;
  renewalPrice: Price;
  years: number | null;
  recommended: boolean;
};

type DomainStatus = {
  name: string;
  verified: boolean;
  verification: Array<{
    type: string;
    domain: string | null;
    value: string | null;
    reason: string | null;
  }>;
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
  const [ownedDomain, setOwnedDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/domains/suggestions`, {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to check domains.");
      const next = payload as Payload;
      setData(next);
      if (next.project.currentDomain) {
        setOwnedDomain((current) => current || next.project.currentDomain || "");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to check domains.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function continueAtVercel(domain: string) {
    setCopied(domain);
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(domain).catch(() => undefined);
    }
    window.open("https://vercel.com/domains", "_blank", "noopener,noreferrer");
  }

  async function connectOwnedDomain(event: FormEvent) {
    event.preventDefault();
    const domain = ownedDomain.trim();
    if (!domain || connecting) return;

    setConnecting(true);
    setConnectionMessage(null);
    setDomainStatus(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/domains/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, confirmation: "CONNECT_DOMAIN" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to connect domain.");
      setDomainStatus(payload.domain as DomainStatus);
      setConnectionMessage(
        payload.domain?.verified
          ? "Domain connected and verified. No DNS changes were made by Z-Life."
          : "Domain attached to the project. DNS verification is still required before publishing on this domain."
      );
      await load();
    } catch (caught) {
      setConnectionMessage(caught instanceof Error ? caught.message : "Unable to connect domain.");
    } finally {
      setConnecting(false);
    }
  }

  async function verifyDomain() {
    const domain = domainStatus?.name ?? ownedDomain.trim();
    if (!domain || verifying) return;

    setVerifying(true);
    setConnectionMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/domains/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, action: "verify" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to verify domain.");
      setDomainStatus(payload.domain as DomainStatus);
      setConnectionMessage(
        payload.domain?.verified
          ? "Domain verified. It is ready for the later production publish approval."
          : "Verification is not complete yet. Use the DNS records shown below, then check again."
      );
    } catch (caught) {
      setConnectionMessage(caught instanceof Error ? caught.message : "Unable to verify domain.");
    } finally {
      setVerifying(false);
    }
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
          <article className="project-card" key={suggestion.domain} style={{ display: "grid", gap: 12 }}>
            <div className="project-card-top">
              <span className={`status-pill ${suggestion.available ? "free" : ""}`}>
                {suggestion.available === true ? "Available" : suggestion.available === false ? "Taken" : "Not checked"}
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
                Continue to Vercel Domains
              </button>
            ) : null}
            {copied === suggestion.domain ? (
              <small>{suggestion.domain} copied. Vercel Domains opened in a new tab. No purchase was made by Z-Life.</small>
            ) : null}
          </article>
        ))}
      </div>

      <form className="project-card" onSubmit={connectOwnedDomain} style={{ display: "grid", gap: 14 }}>
        <div>
          <p className="panel-label">Already own a domain?</p>
          <h2 style={{ marginBottom: 6 }}>Connect it to this project.</h2>
          <p>
            This attaches the domain to the project&apos;s selected Vercel deployment target only after you press the button below. Z-Life does not change registrar DNS records or publish the website in this step.
          </p>
        </div>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Domain you own</span>
          <input
            className="input"
            type="text"
            value={ownedDomain}
            onChange={(event) => setOwnedDomain(event.target.value)}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect="off"
            required
          />
        </label>
        <div className="inline-actions">
          <button className="button primary" type="submit" disabled={connecting || !data.providerConfigured}>
            {connecting ? "Connecting…" : "Connect this domain"}
          </button>
          <Link className="button" href={`/projects/${projectId}/settings/deployment`}>
            Deployment target
          </Link>
          <Link className="button" href={`/projects/${projectId}/studio`}>
            Back to preview
          </Link>
        </div>
        {connectionMessage ? <p>{connectionMessage}</p> : null}
      </form>

      {domainStatus ? (
        <section className="project-card" style={{ display: "grid", gap: 14 }}>
          <div className="project-card-top">
            <div>
              <p className="panel-label">Connection status</p>
              <h2 style={{ marginBottom: 4 }}>{domainStatus.name}</h2>
            </div>
            <span className={`status-pill ${domainStatus.verified ? "free" : ""}`}>
              {domainStatus.verified ? "Verified" : "DNS verification needed"}
            </span>
          </div>

          {!domainStatus.verified && domainStatus.verification.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              <p>Add the following record(s) at your domain provider, then return and check again.</p>
              {domainStatus.verification.map((record, index) => (
                <article className="project-card" key={`${record.type}-${record.domain}-${index}`}>
                  <strong>{record.type}</strong>
                  {record.domain ? <div>Name/Host: {record.domain}</div> : null}
                  {record.value ? <div>Value: {record.value}</div> : null}
                  {record.reason ? <small>{record.reason}</small> : null}
                </article>
              ))}
            </div>
          ) : null}

          {!domainStatus.verified ? (
            <div>
              <button className="button primary" type="button" disabled={verifying} onClick={() => void verifyDomain()}>
                {verifying ? "Checking…" : "Check DNS again"}
              </button>
            </div>
          ) : (
            <p>Domain connection is ready. Production publishing remains a separate approval.</p>
          )}
        </section>
      ) : null}

      {data.checkedAt ? (
        <small>Live provider results checked {new Date(data.checkedAt).toLocaleString()}. Prices can change before checkout.</small>
      ) : null}
    </section>
  );
}
