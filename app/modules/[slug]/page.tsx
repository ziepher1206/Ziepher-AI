import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ZLifeModuleBackLink } from "@/components/zlife-module-back-link";
import { zlifeModuleBySlug, zlifeModules } from "@/lib/zlife/modules";
import { ZLIFE_PUBLIC_ORIGIN } from "@/lib/zlife/public-origin";

export function generateStaticParams() {
  return zlifeModules.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const selectedModule = zlifeModuleBySlug.get(slug);

  if (!selectedModule) return {};

  const url = `${ZLIFE_PUBLIC_ORIGIN}/modules/${selectedModule.slug}`;

  return {
    title: selectedModule.name,
    description: selectedModule.summary,
    alternates: { canonical: url },
    openGraph: {
      title: selectedModule.name,
      description: selectedModule.summary,
      url,
      type: "website"
    }
  };
}

export default async function ZLifeModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const selectedModule = zlifeModuleBySlug.get(slug);

  if (!selectedModule) notFound();

  return (
    <main className="zlife-landing">
      <header className="zlife-nav">
        <ZLifeModuleBackLink className="zlife-brand">
          <span className="zlife-mark" aria-hidden="true">
            <span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span>
          </span>
          <small>by Ziepher Tech</small>
        </ZLifeModuleBackLink>
        <nav aria-label="Module navigation">
          <ZLifeModuleBackLink>← Back to modules</ZLifeModuleBackLink>
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
          <ZLifeModuleBackLink className="zlife-secondary">Back to modules</ZLifeModuleBackLink>
        </div>
      </section>
    </main>
  );
}
