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
    keywords: ["doctor", "health", "wellness", "medicine", "appointment", "fitness"],
    suggestion: { area: "Health", href: "/modules/health", title: "Review the Health module", detail: "Health and wellness organization will stay permission-aware and clearly separate from medical care." }
  },
  {
    keywords: ["lead", "estimate", "invoice", "job", "crew", "customer", "business", "marketing", "payment", "schedule"],
    suggestion: { area: "Business", href: "/operate/assistant", title: "Open the Business AI workspace", detail: "Use live workspace records to prioritize leads, estimates, jobs, invoices, growth, and other business work." }
  },
  {
    keywords: ["home", "family", "house", "maintenance", "chore", "task", "school pickup", "kid", "grocery", "shopping"],
    suggestion: { area: "Home & Family", href: "/home", title: "Open Home & Family", detail: "Work with household tasks, maintenance, routines, and the home context currently connected to Z-Life." }
  },
  {
    keywords: ["website", "site", "landing page", "seo", "web"],
    suggestion: { area: "Build", href: "/projects", title: "Open website projects", detail: "Create, connect, review, and improve websites through the source-controlled build workflow." }
  },
  {
    keywords: ["money", "budget", "spending", "finance", "subscription", "bill"],
    suggestion: { area: "Money", href: "/modules/money", title: "Review the Money module", detail: "See the planned Z-Life Money capabilities. Personal financial actions remain unavailable until that module is safely connected." }
  },
  {
    keywords: ["car", "truck", "vehicle", "oil", "auto", "maintenance reminder"],
    suggestion: { area: "Auto", href: "/modules/auto", title: "Review the Auto module", detail: "Vehicle records, service history, ownership costs, and maintenance reminders belong here as the module comes online." }
  },
  {
    keywords: ["travel", "trip", "flight", "hotel", "vacation", "itinerary"],
    suggestion: { area: "Travel", href: "/modules/travel", title: "Review the Travel module", detail: "Trips, itineraries, reservations, documents, and shared planning will live here." }
  },
  {
    keywords: ["learn", "study", "course", "school work", "homework", "skill", "research"],
    suggestion: { area: "Learning", href: "/modules/learning", title: "Review the Learning module", detail: "Learning goals, plans, resources, and progress will be organized here as the module develops." }
  },
  {
    keywords: ["service", "plumber", "contractor", "repair", "cleaner", "landscaper", "roofer"],
    suggestion: { area: "Services", href: "/services", title: "Open Services", detail: "Create or track a service need and keep the request connected to your Z-Life workspace." }
  }
];

function routeFor(text: string): RouteSuggestion {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return { area: "Z-Life", href: "/dashboard", title: "Tell Z-Life what you want to do", detail: "Describe a goal, problem, reminder, business task, or part of life you want help organizing." };
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
    area: "Z-Life Core",
    href: "/dashboard/modules",
    title: "Choose the closest Z-Life module",
    detail: "This zero-cost router does not have enough connected context to classify that request confidently yet. Browse modules rather than sending your text to a paid model without approval."
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
    <section style={{ display: "grid", gap: 16 }}>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="zlife-assistant-request" style={{ color: "#b8d2cf", fontSize: 13 }}>What do you want help with?</label>
        <textarea
          id="zlife-assistant-request"
          value={text}
          onChange={(event) => { setText(event.target.value); setSubmitted(false); }}
          placeholder="Example: I have two new business leads, a doctor appointment tomorrow, and I need groceries tonight…"
          rows={5}
          maxLength={2000}
          style={{ width: "100%", resize: "vertical", border: "1px solid rgba(78,234,221,.30)", borderRadius: 16, padding: 16, background: "rgba(0,0,0,.24)", color: "#f6fffd", lineHeight: 1.55 }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <button type="submit" className="button primary" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 }}>Find the right Z-Life area</button>
          <span style={{ color: "#789b97", fontSize: 12 }}>Zero-cost routing · no paid AI request</span>
        </div>
      </form>

      {submitted ? (
        <article style={{ border: "1px solid rgba(127,255,212,.34)", borderRadius: 16, padding: 18, background: "rgba(16,217,129,.055)" }}>
          <span className="status-pill" style={{ color: "#7fffd4" }}>{suggestion.area}</span>
          <h3 style={{ margin: "14px 0 6px" }}>{suggestion.title}</h3>
          <p style={{ margin: 0, color: "#9dbbb7", lineHeight: 1.55 }}>{suggestion.detail}</p>
          <Link href={suggestion.href} className="button primary" style={{ display: "inline-flex", marginTop: 14, textDecoration: "none", background: "linear-gradient(135deg,#38e0f3,#7fffd4)", color: "#001112", border: 0 }}>Continue →</Link>
        </article>
      ) : null}
    </section>
  );
}
