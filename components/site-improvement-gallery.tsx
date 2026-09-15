"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Improvement = {
  title: string;
  reason: string;
  recommendedChange: string;
  impact?: "high" | "medium" | "low";
  category?: string;
};

type Props = {
  projectId: string;
  recommendations: string[];
  priorities?: Improvement[];
};

const visualStyles = [
  { name: "Clean Minimal", bg: "#f7f8f7", surface: "#ffffff", ink: "#17201f", accent: "#0f8f78" },
  { name: "Dark Cinematic", bg: "#090d0d", surface: "#121b1a", ink: "#edf9f5", accent: "#63f2c9" },
  { name: "Bold Graphic", bg: "#111317", surface: "#f1efe8", ink: "#151515", accent: "#ff7a3d" },
  { name: "Refined", bg: "#efe9df", surface: "#fffdf8", ink: "#302c27", accent: "#687f66" },
  { name: "Soft & Friendly", bg: "#eef8f6", surface: "#ffffff", ink: "#18312d", accent: "#3aa993" },
  { name: "Editorial", bg: "#f2f0ea", surface: "#fcfbf7", ink: "#171717", accent: "#9d5139" }
] as const;

const layouts = ["Split hero", "Full-bleed hero", "Trust-first", "Service grid", "Editorial story", "Conversion-first"] as const;

function categoryFor(text: string) {
  const value = text.toLowerCase();
  if (value.includes("mobile") || value.includes("responsive")) return "Mobile";
  if (value.includes("call") || value.includes("cta") || value.includes("button") || value.includes("contact")) return "Conversion";
  if (value.includes("image") || value.includes("photo") || value.includes("visual")) return "Visuals";
  if (value.includes("trust") || value.includes("review") || value.includes("testimonial")) return "Trust";
  if (value.includes("speed") || value.includes("performance")) return "Performance";
  if (value.includes("seo") || value.includes("title") || value.includes("description")) return "Search";
  return "Design";
}

function ExampleCard({
  style,
  layout,
  title,
  index
}: {
  style: (typeof visualStyles)[number];
  layout: (typeof layouts)[number];
  title: string;
  index: number;
}) {
  return (
    <div
      aria-label={`${style.name} ${layout} example`}
      style={{
        background: style.bg,
        border: "1px solid rgba(127,255,212,.18)",
        borderRadius: 18,
        overflow: "hidden",
        minHeight: 250,
        display: "grid",
        gridTemplateRows: "auto 1fr auto"
      }}
    >
      <div style={{ display: "flex", gap: 5, padding: "10px 12px", opacity: .65 }}>
        <i style={{ width: 7, height: 7, borderRadius: 99, background: style.accent }} />
        <i style={{ width: 7, height: 7, borderRadius: 99, background: style.ink }} />
        <i style={{ width: 7, height: 7, borderRadius: 99, background: style.surface }} />
      </div>
      <div style={{ padding: 14, display: "grid", gap: 10, color: style.ink }}>
        <div
          style={{
            background: style.surface,
            borderRadius: 14,
            padding: 16,
            display: "grid",
            gridTemplateColumns: index % 2 === 0 ? "1.2fr .8fr" : "1fr",
            gap: 12,
            minHeight: 118
          }}
        >
          <div style={{ display: "grid", gap: 8, alignContent: "center" }}>
            <strong style={{ fontSize: 20, lineHeight: 1.05 }}>A clearer first impression</strong>
            <span style={{ fontSize: 11, opacity: .72 }}>Stronger hierarchy, clearer action, more visual confidence.</span>
            <span style={{ width: 90, borderRadius: 999, padding: "7px 10px", background: style.accent, color: style.bg, fontSize: 10, fontWeight: 800, textAlign: "center" }}>Primary action</span>
          </div>
          {index % 2 === 0 ? (
            <div style={{ borderRadius: 12, background: `linear-gradient(145deg, ${style.accent}, ${style.ink})`, minHeight: 82 }} />
          ) : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
          {[0, 1, 2].map((item) => <div key={item} style={{ height: 34, borderRadius: 9, background: style.surface }} />)}
        </div>
      </div>
      <div style={{ padding: "10px 14px 13px", color: style.ink, fontSize: 11, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>{style.name}</span><span>{layout}</span>
      </div>
    </div>
  );
}

export function SiteImprovementGallery({ projectId, recommendations, priorities = [] }: Props) {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState(0);

  const items = useMemo<Improvement[]>(() => {
    if (priorities.length) return priorities;
    return recommendations.map((text) => ({
      title: categoryFor(text),
      reason: text,
      recommendedChange: text,
      category: categoryFor(text)
    }));
  }, [priorities, recommendations]);

  if (!items.length) return null;

  const active = items[Math.min(selected, items.length - 1)];
  const examples = Array.from({ length: 6 }, (_, index) => ({
    style: visualStyles[(round * 3 + index) % visualStyles.length],
    layout: layouts[(round * 2 + index) % layouts.length],
    index
  }));

  return (
    <section className="auth-card" style={{ maxWidth: "none", display: "grid", gap: 18 }}>
      <div className="project-card-top" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="panel-label">Visual improvement guide</p>
          <h2 style={{ margin: "6px 0" }}>See what could be better before changing anything.</h2>
          <p className="auth-copy" style={{ maxWidth: 860 }}>
            Pick an improvement Z-Life found, browse visual directions, then send the direction you like into the refinement flow. Examples are generated from reusable layout and style systems rather than copied websites.
          </p>
        </div>
        <span className="status-pill">Browse endlessly</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items.map((item, index) => (
          <button
            type="button"
            key={`${item.title}-${index}`}
            className={`button ${selected === index ? "primary" : ""}`}
            onClick={() => setSelected(index)}
          >
            {item.category ?? item.title}
          </button>
        ))}
      </div>

      <section className="project-card" style={{ display: "grid", gap: 8 }}>
        <div className="project-card-top">
          <span className="status-pill">{active.impact ? `${active.impact} impact` : "Improvement"}</span>
          <span className="project-version">{active.category ?? categoryFor(active.recommendedChange)}</span>
        </div>
        <h3 style={{ margin: 0 }}>{active.title}</h3>
        <p style={{ margin: 0 }}>{active.reason}</p>
        <p style={{ margin: 0 }}><strong>Z-Life suggests:</strong> {active.recommendedChange}</p>
      </section>

      <div className="project-grid" style={{ marginTop: 0 }}>
        {examples.map(({ style, layout, index }) => (
          <article key={`${round}-${style.name}-${layout}-${index}`} style={{ display: "grid", gap: 10 }}>
            <ExampleCard style={style} layout={layout} title={active.title} index={index} />
            <Link
              className="button"
              href={{
                pathname: `/projects/${projectId}/changes`,
                query: {
                  source: "scan_recommendation",
                  reference: `visual-example-${round}-${selected}-${index}`,
                  title: active.title,
                  instructions: `${active.recommendedChange}\n\nVisual direction: ${style.name}, ${layout}. Keep the business branding and content, but use this visual direction as the starting point.`
                }
              }}
            >
              Use this direction
            </Link>
          </article>
        ))}
      </div>

      <div className="inline-actions">
        <button className="button primary" type="button" onClick={() => setRound((value) => value + 1)}>
          Show me more examples
        </button>
        <Link className="button" href={`/projects/${projectId}/media`}>
          Add a reference I found
        </Link>
      </div>
      <small>
        Each refresh creates another mix of layout and visual systems. No external design is copied into the project automatically.
      </small>
    </section>
  );
}
