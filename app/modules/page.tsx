import Link from "next/link";
import { ZLifeHeartbeat } from "@/components/zlife-heartbeat";
import { ZLifePublicShell } from "@/components/zlife-public-shell";
import { zlifeModules, zlifeModuleStatusLabel, zlifeModuleStatusShortLabel, type ZLifeModuleDefinition, type ZLifeModuleStatus } from "@/lib/zlife/modules";

function ModuleCard({ item }: { item: ZLifeModuleDefinition }) {
  return (
    <Link
      aria-label={`${item.name}. ${zlifeModuleStatusLabel(item.status)}.`}
      className={`zlife-module-card ${item.status === "active" || item.status === "launch" ? "is-active" : ""} ${item.nestedLabel ? "has-nested" : ""}`}
      href={`/modules/${item.slug}`}
    >
      <div className="zlife-module-brand" aria-hidden="true">
        <span className="module-z">Z</span>
        <ZLifeHeartbeat width={34} height={13} />
        <span>LIFE</span>
      </div>
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
  );
}

function ModuleGroup({ title, copy, status }: { title: string; copy: string; status: ZLifeModuleStatus }) {
  const items = zlifeModules.filter((item) => item.status === status);
  if (!items.length) return null;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div>
        <p className="zlife-kicker" style={{ marginBottom: 4 }}>{title}</p>
        <p style={{ margin: 0, opacity: .78 }}>{copy}</p>
      </div>
      <div className="zlife-module-grid">
        {items.map((item) => <ModuleCard item={item} key={item.slug} />)}
      </div>
    </section>
  );
}

export default function ModulesPage() {
  return (
    <ZLifePublicShell>
      <section className="zlife-section" style={{ paddingTop: 120, display: "grid", gap: 34 }}>
        <div className="zlife-section-heading">
          <div>
            <p className="zlife-kicker">Z-LIFE MODULES</p>
            <h1>One platform. Specialized modules.</h1>
            <p>Every module connects to the same Z-Life identity, assistant, permissions, and account. The builder launches first, working modules remain available, and future modules are clearly separated.</p>
          </div>
        </div>

        <ModuleGroup
          title="LAUNCHING FIRST"
          copy="The first public Z-Life experience: build, preview, refine, choose a domain, and prepare to publish websites and apps."
          status="launch"
        />
        <ModuleGroup
          title="WORKING NOW"
          copy="Existing connected Z-Life foundations you can already open and use."
          status="active"
        />
        <ModuleGroup
          title="IN DEVELOPMENT"
          copy="Planned modules are visible for transparency, but they are not presented as finished products."
          status="development"
        />
      </section>
    </ZLifePublicShell>
  );
}
