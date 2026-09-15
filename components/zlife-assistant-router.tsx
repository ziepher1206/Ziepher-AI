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
    suggestion: { area: "Business", href: "/operate", title: "Open Business", detail: "Use the working Business workspace for leads, estimates, scheduling, jobs, invoices, and customers." }
  },
  {
    keywords: ["home", "family", "house", "maintenance", "chore", "task"],
    suggestion: { area: "Home & Family", href: "/home", title: "Open Home & Family", detail: "Use the connected home workspace for household tasks and maintenance." }
  },
  {
    keywords: ["website", "site", "landing page", "seo", "web"],
    suggestion: { area: "Projects", href: "/projects", title: "Open Projects", detail: "Use the current project workspace for website and build work." }
  }
];

const dailyContextKeywords = [
  "doctor", "health", "wellness", "medicine", "appointment", "fitness",
  "money", "budget", "spending", "finance", "subscription", "bill",
  "car", "truck", "vehicle", "oil", "auto",
  "travel", "trip", "flight", "hotel", "vacation", "itinerary",
  "learn", "study", "course", "school", "homework", "skill", "research",
  "grocery", "shopping", "errand", "reminder", "document", "paperwork"
];

function routeFor(text: string): RouteSuggestion {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return { area: "Z-Life", href: "/dashboard", title: "Tell Z-Life what you need", detail: "Describe the thing you want to do in plain language." };
  }

  const matches = routes.filter((route) => route.keywords.some((keyword) => normalized.includes(keyword)));
  if (matches.length > 1) {
    return {
      area: "My Day",
      href: "/today",
      title: "Keep it together in My Day",
      detail: "That request touches more than one working area, so My Day is the simplest place to keep the pieces together."
    };
  }

  if (matches.length === 1) return matches[0].suggestion;

  if (dailyContextKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      area: "My Day",
      href: "/today",
      title: "Add it to My Day",
      detail: "That full module is not ready yet. You can still track the task, reminder, appointment, bill, errand, or note in My Day without hitting a dead end."
    };
  }

  return {
    area: "My Day",
    href: "/today",
    title: "Start with My Day",
    detail: "Z-Life does not have a reliable working destination for that yet. My Day is the safest simple place to keep it until the right tool is ready."
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
          aria-label="What do you want help with?"
          value={text}
          onChange={(event) => { setText(event.target.value); setSubmitted(false); }}
          placeholder="Example: I need to call a new lead and remember groceries tonight"
          rows={4}
          maxLength={2000}
          style={{ width: "100%", resize: "vertical", border: "1px solid rgba(78,234,221,.30)", borderRadius: 16, padding: 16, background: "rgba(0,0,0,.24)", color: "#f6fffd", lineHeight: 1.55, fontSize: 16 }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <button type="submit" className="button primary" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 }}>Show me where to go</button>
          <span style={{ color: "#789b97", fontSize: 12 }}>No paid AI call</span>
        </div>
      </form>

      {submitted ? (
        <article style={{ border: "1px solid rgba(127,255,212,.34)", borderRadius: 16, padding: 18, background: "rgba(16,217,129,.055)" }}>
          <span className="status-pill" style={{ color: "#7fffd4" }}>{suggestion.area}</span>
          <h3 style={{ margin: "12px 0 6px" }}>{suggestion.title}</h3>
          <p style={{ margin: 0, color: "#9dbbb7", lineHeight: 1.55 }}>{suggestion.detail}</p>
          <Link href={suggestion.href} className="button primary" style={{ display: "inline-flex", marginTop: 14, textDecoration: "none", background: "linear-gradient(135deg,#38e0f3,#7fffd4)", color: "#001112", border: 0 }}>Open →</Link>
        </article>
      ) : null}
    </section>
  );
}
