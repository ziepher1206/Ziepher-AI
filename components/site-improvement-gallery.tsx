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
const heroTreatments = ["Framed media", "Layered cards", "Metric-led", "Product mockup", "Editorial image", "Before / after"] as const;
const proofPatterns = ["Review strip", "Stats row", "Logo cloud", "Process steps", "Featured quote", "Guarantee card"] as const;
const densities = ["Airy", "Balanced", "Compact"] as const;

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

function HeroVisual({
  treatment,
  style,
  index
}: {
  treatment: (typeof heroTreatments)[number];
  style: (typeof visualStyles)[number];
  index: number;
}) {
  if (treatment === "Layered cards") {
    return (
      <div style={{ position: "relative", minHeight: 94 }}>
        <div style={{ position: "absolute", inset: "10px 12px 4px 24px", borderRadius: 13, background: style.ink, opacity: .18, transform: "rotate(4deg)" }} />
        <div style={{ position: "absolute", inset: "4px 22px 12px 8px", borderRadius: 13, background: style.accent, opacity: .34, transform: "rotate(-3deg)" }} />
        <div style={{ position: "absolute", inset: "16px 6px 0 18px", borderRadius: 13, background: style.surface, border: `1px solid ${style.accent}44` }} />
      </div>
    );
  }

  if (treatment === "Metric-led") {
    return (
      <div style={{ minHeight: 94, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        {["48h", "4.9★", "+31%", "24/7"].map((value) => (
          <div key={value} style={{ borderRadius: 11, background: style.surface, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 900, color: style.ink }}>{value}</div>
        ))}
      </div>
    );
  }

  if (treatment === "Product mockup") {
    return (
      <div style={{ minHeight: 94, borderRadius: 14, background: style.ink, padding: 8, display: "grid", gridTemplateRows: "12px 1fr", gap: 6 }}>
        <div style={{ display: "flex", gap: 4 }}>{[0, 1, 2].map((dot) => <i key={dot} style={{ width: 5, height: 5, borderRadius: 99, background: dot === 0 ? style.accent : style.surface, opacity: .8 }} />)}</div>
        <div style={{ borderRadius: 9, background: style.surface, display: "grid", gridTemplateColumns: "1fr .7fr", gap: 6, padding: 7 }}><span style={{ borderRadius: 6, background: `${style.accent}33` }} /><span style={{ borderRadius: 6, background: `${style.ink}18` }} /></div>
      </div>
    );
  }

  if (treatment === "Before / after") {
    return (
      <div style={{ minHeight: 94, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        <div style={{ borderRadius: 12, background: `${style.ink}25`, position: "relative" }}><small style={{ position: "absolute", left: 7, bottom: 6, fontSize: 8, opacity: .7 }}>Before</small></div>
        <div style={{ borderRadius: 12, background: `linear-gradient(145deg, ${style.accent}, ${style.ink})`, position: "relative" }}><small style={{ position: "absolute", left: 7, bottom: 6, fontSize: 8, color: style.bg }}>After</small></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 94, borderRadius: 14, background: treatment === "Editorial image" ? `linear-gradient(${135 + index * 9}deg, ${style.ink}, ${style.accent})` : `linear-gradient(145deg, ${style.accent}, ${style.ink})`, position: "relative", overflow: "hidden" }}>
      <span style={{ position: "absolute", width: 72, height: 72, borderRadius: "40% 60% 55% 45%", background: style.surface, opacity: .15, right: -8, top: -12, transform: "rotate(20deg)" }} />
      <span style={{ position: "absolute", width: 46, height: 46, borderRadius: 99, border: `1px solid ${style.surface}66`, left: 12, bottom: 10 }} />
    </div>
  );
}

function ExampleCard({
  style,
  layout,
  heroTreatment,
  proofPattern,
  density,
  index
}: {
  style: (typeof visualStyles)[number];
  layout: (typeof layouts)[number];
  heroTreatment: (typeof heroTreatments)[number];
  proofPattern: (typeof proofPatterns)[number];
  density: (typeof densities)[number];
  index: number;
}) {
  const gap = density === "Airy" ? 14 : density === "Compact" ? 7 : 10;
  return (
    <div
      aria-label={`${style.name} ${layout} ${heroTreatment} ${proofPattern} example`}
      style={{
        background: style.bg,
        border: "1px solid rgba(127,255,212,.18)",
        borderRadius: 18,
        overflow: "hidden",
        minHeight: 280,
        display: "grid",
        gridTemplateRows: "auto 1fr auto"
      }}
    >
      <div style={{ display: "flex", gap: 5, padding: "10px 12px", opacity: .65 }}>
        <i style={{ width: 7, height: 7, borderRadius: 99, background: style.accent }} />
        <i style={{ width: 7, height: 7, borderRadius: 99, background: style.ink }} />
        <i style={{ width: 7, height: 7, borderRadius: 99, background: style.surface }} />
      </div>
      <div style={{ padding: 14, display: "grid", gap, color: style.ink }}>
        <div
          style={{
            background: style.surface,
            borderRadius: 14,
            padding: density === "Compact" ? 12 : 16,
            display: "grid",
            gridTemplateColumns: layout === "Full-bleed hero" || layout === "Editorial story" ? "1fr" : index % 2 === 0 ? "1.15fr .85fr" : "1fr",
            gap: 12,
            minHeight: 128
          }}
        >
          <div style={{ display: "grid", gap: 8, alignContent: "center" }}>
            <small style={{ fontSize: 8, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: style.accent }}>{layout}</small>
            <strong style={{ fontSize: density === "Airy" ? 22 : 19, lineHeight: 1.02 }}>A clearer first impression</strong>
            <span style={{ fontSize: 10, opacity: .72 }}>Stronger hierarchy, clearer action, more visual confidence.</span>
            <span style={{ width: 90, borderRadius: 999, padding: "7px 10px", background: style.accent, color: style.bg, fontSize: 9, fontWeight: 800, textAlign: "center" }}>Primary action</span>
          </div>
          {layout === "Full-bleed hero" || layout === "Editorial story" ? null : <HeroVisual treatment={heroTreatment} style={style} index={index} />}
        </div>
        {layout === "Full-bleed hero" || layout === "Editorial story" ? <HeroVisual treatment={heroTreatment} style={style} index={index} /> : null}
        <div style={{ display: "grid", gridTemplateColumns: proofPattern === "Featured quote" ? "1fr" : "repeat(3,1fr)", gap: 7 }}>
          {(proofPattern === "Featured quote" ? [0] : [0, 1, 2]).map((item) => (
            <div key={item} style={{ minHeight: 34, borderRadius: 9, background: style.surface, padding: 7, display: "flex", alignItems: "center", gap: 5 }}>
              <i style={{ width: 9, height: 9, borderRadius: 99, background: style.accent, opacity: .55 }} />
              <span style={{ height: 4, flex: 1, borderRadius: 99, background: `${style.ink}22` }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 14px 13px", color: style.ink, fontSize: 10, display: "grid", gap: 3 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span>{style.name}</span><span>{layout}</span></div>
        <div style={{ opacity: .68 }}>{heroTreatment} · {proofPattern} · {density}</div>
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
    style: visualStyles[(round * 5 + index * 2) % visualStyles.length],
    layout: layouts[(round * 3 + index) % layouts.length],
    heroTreatment: heroTreatments[(round * 7 + index * 3) % heroTreatments.length],
    proofPattern: proofPatterns[(round * 11 + index * 5) % proofPatterns.length],
    density: densities[(round + index) % densities.length],
    index
  }));

  return (
    <section className="auth-card" style={{ maxWidth: "none", display: "grid", gap: 18 }}>
      <div className="project-card-top" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="panel-label">Visual improvement guide</p>
          <h2 style={{ margin: "6px 0" }}>See what could be better before changing anything.</h2>
          <p className="auth-copy" style={{ maxWidth: 860 }}>
            Pick an improvement Z-Life found, browse visual directions, then send the direction you like into the refinement flow. The gallery continuously remixes style, structure, hero treatment, trust pattern, and density rather than copying somebody else&apos;s website.
          </p>
        </div>
        <span className="status-pill">Hundreds of combinations</span>
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
        {examples.map(({ style, layout, heroTreatment, proofPattern, density, index }) => (
          <article key={`${round}-${style.name}-${layout}-${heroTreatment}-${proofPattern}-${index}`} style={{ display: "grid", gap: 10 }}>
            <ExampleCard style={style} layout={layout} heroTreatment={heroTreatment} proofPattern={proofPattern} density={density} index={index} />
            <Link
              className="button"
              href={{
                pathname: `/projects/${projectId}/changes`,
                query: {
                  source: "scan_recommendation",
                  reference: `visual-example-${round}-${selected}-${index}`,
                  title: active.title,
                  instructions: `${active.recommendedChange}\n\nVisual direction: ${style.name}; ${layout}; ${heroTreatment}; ${proofPattern}; ${density.toLowerCase()} spacing. Keep the business branding and content, but use this complete visual system as the starting point.`
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
          Show me 6 more directions
        </button>
        <Link className="button" href={`/projects/${projectId}/media`}>
          Add a reference I found
        </Link>
      </div>
      <small>
        Each refresh creates a new combination across visual style, layout, hero treatment, proof pattern, and content density. No external design is copied into the project automatically.
      </small>
    </section>
  );
}
