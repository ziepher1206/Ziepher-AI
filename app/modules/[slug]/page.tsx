import Link from "next/link";
import { notFound } from "next/navigation";

import { zlifeModuleBySlug, zlifeModules } from "@/lib/zlife/modules";

export function generateStaticParams() {
  return zlifeModules.map((item) => ({ slug: item.slug }));
}

export default async function ZLifeModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const selectedModule = zlifeModuleBySlug.get(slug);

  if (!selectedModule) notFound();

  return (
    <main className="zlife-landing">
      <header className="zlife-nav">
        <Link href="/#modules" className="zlife-brand" aria-label="Back to Z-Life modules">
          <span className="zlife-mark" aria-hidden="true">
            <span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span>
          </span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="Module navigation">
          <Link href="/#modules">← Back to modules</Link>
          <Link href="/">Home</Link>
        </nav>
      </header>

      <section className="zlife-section" style={{ paddingTop: "120px" }}>
        <div className="zlife-section-heading">
          <div>
            <p className="zlife-kicker">Z-LIFE MODULE</p>
            <h1>{selectedModule.name}</h1>
            <p>{selectedModule.summary}</p>
          </div>
          <span className={`zlife-status ${selectedModule.status === "active" ? "is-active" : ""}`}>
            {selectedModule.status === "active" ? "Active Module" : "In Development"}
          </span>
        </div>

        {selectedModule.nestedLabel ? (
          <div className="zlife-nested-module" style={{ marginBottom: "24px" }}>
            <span>▲</span><div><strong>Tree Service</strong><small>First active business vertical</small></div><b>ACTIVE</b>
          </div>
        ) : null}

        <div className="zlife-flow-grid">
          {selectedModule.capabilities.map((capability, index) => (
            <article key={capability}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{capability}</h3>
            </article>
          ))}
        </div>

        <div className="zlife-hero-actions" style={{ marginTop: "32px" }}>
          {selectedModule.launchHref ? <Link className="zlife-primary" href={selectedModule.launchHref}>Open {selectedModule.shortName} <span>→</span></Link> : null}
          <Link className="zlife-secondary" href="/#modules">Back to modules</Link>
        </div>
      </section>
    </main>
  );
}
