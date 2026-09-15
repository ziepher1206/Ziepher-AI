import Link from "next/link";
import { ZLifePublicShell } from "@/components/zlife-public-shell";
import { zlifeModules, zlifeModuleStatusLabel, zlifeModuleStatusShortLabel } from "@/lib/zlife/modules";

export default function ModulesPage() {
  return (
    <ZLifePublicShell>
      <section className="zlife-section" style={{ paddingTop: 120 }}>
        <div className="zlife-section-heading">
          <div>
            <p className="zlife-kicker">Z-LIFE MODULES</p>
            <h1>One platform. Specialized modules.</h1>
            <p>Every module connects to the same Z-Life identity, assistant, permissions, and account. Launch Focus marks what Z-Life is actively preparing to release first.</p>
          </div>
        </div>

        <div className="zlife-module-grid">
          {zlifeModules.map((item) => (
            <Link
              aria-label={`${item.name}. ${zlifeModuleStatusLabel(item.status)}.`}
              className={`zlife-module-card ${item.status === "active" || item.status === "launch" ? "is-active" : ""} ${item.nestedLabel ? "has-nested" : ""}`}
              href={`/modules/${item.slug}`}
              key={item.slug}
            >
              <div className="zlife-module-brand"><span className="module-z">Z</span><span>Z-LIFE</span></div>
              <div className="zlife-module-main">
                <span className="zlife-module-icon" aria-hidden="true">{item.icon}</span>
                <div><h3>{item.shortName}</h3><p>{item.description}</p></div>
              </div>

              {item.nestedLabel ? (
                <div className="zlife-nested-module">
                  <span aria-hidden="true">▲</span>
                  <div>
                    <strong>{item.nestedLabel}</strong>
                    <small>{item.slug === "business" ? "Industry profile inside Z-Life Business" : "Working foundation inside this module"}</small>
                  </div>
                  <b>{zlifeModuleStatusShortLabel(item.status)}</b>
                </div>
              ) : null}

              <span className={`zlife-status ${item.status === "active" || item.status === "launch" ? "is-active" : ""}`}>
                {zlifeModuleStatusLabel(item.status)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </ZLifePublicShell>
  );
}
