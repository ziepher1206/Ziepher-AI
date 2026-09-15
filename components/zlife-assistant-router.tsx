"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type RouteSuggestion = {
  area: string;
  href: string;
  title: string;
  detail: string;
};

type RouteDefinition = {
  keywords: string[];
  suggestion: RouteSuggestion;
};

const routes: RouteDefinition[] = [
  {
    keywords: ["lead", "estimate", "invoice", "job", "crew", "customer", "business", "marketing", "payment", "schedule"],
    suggestion: { area: "Business", href: "/operate/assistant", title: "Open Business", detail: "This is a working Z-Life area for leads, estimates, jobs, invoices, scheduling, and business priorities." }
  },
  {
    keywords: ["home", "family", "house", "maintenance", "chore", "task", "school pickup", "kid", "grocery", "shopping"],
    suggestion: { area: "Home & Family", href: "/home", title: "Open Home & Family", detail: "Use the connected household workspace for tasks, maintenance, routines, and family organization." }
  },
  {
    keywords: ["website", "site", "landing page", "seo", "web"],
    suggestion: { area: "Build", href: "/projects", title: "Open website projects", detail: "Use the working project area for websites and source-controlled builds." }
  }
];

function routeFor(text: string): RouteSuggestion {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return { area: "Z-Life", href: "/today", title: "Start with My Day", detail: "Add what you need to do or remember and keep everything in one place." };
  }

  const matches = routes.filter((route) => route.keywords.some((keyword) => normalized.includes(keyword)));
  if (matches.length > 1) {
    const areas = Array.from(new Set(matches.map((match) => match.suggestion.area)));
    return {
      area: "My Day",
      href: "/today",
      title: "Open My Day",
      detail: `That request crosses ${areas.join(", ")}. Keep the pieces together in My Day instead of being sent into one isolated module.`
    };
  }

  if (matches.length === 1) return matches[0].suggestion;

  return {
    area: "My Day",
    href: "/today",
    title: "Keep it in My Day",
    detail: "That feature is not ready as a separate module yet. You can still add the task, reminder, appointment, bill, grocery item, or note to My Day now."
  };
}

export function ZLifeAssistantRouter() {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const suggestion = useMemo(() => routeFor(text), [text]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <textarea
          aria-label="What do you need help with?"
          value={text}
          onChange={(event) => { setText(event.target.value); setSubmitted(false); }}
          placeholder="Example: remind me to pay the electric bill Friday"
          rows={3}
          maxLength={2000}
          style={{ width: "100%", resize: "vertical", border: "1px solid rgba(78,234,221,.30)", borderRadius: 16, padding: 16, background: "rgba(0,0,0,.24)", color: "#f6fffd", lineHeight: 1.55, fontSize: 16 }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <button type="submit" className="button primary" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 }}>Help me</button>
          <span style={{ color: "#789b97", fontSize: 12 }}>No paid AI call</span>
        </div>
      </form>

      {submitted ? (
        <article style={{ border: "1px solid rgba(127,255,212,.34)", borderRadius: 16, padding: 18, background: "rgba(16,217,129,.055)" }}>
          <span className="status-pill" style={{ color: "#7fffd4" }}>{suggestion.area}</span>
          <h3 style={{ margin: "14px 0 6px" }}>{suggestion.title}</h3>
          <p style={{ margin: 0, color: "#9dbbb7", lineHeight: 1.55 }}>{suggestion.detail}</p>
          <Link href={suggestion.href} className="button primary" style={{ display: "inline-flex", marginTop: 14, textDecoration: "none", background: "linear-gradient(135deg,#38e0f3,#7fffd4)", color: "#001112", border: 0 }}>Continue</Link>
        </article>
      ) : null}
    </section>
  );
}
