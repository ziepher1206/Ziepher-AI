import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="system-page">
      <section className="system-card">
        <div className="brand-mark large">Z</div>
        <span className="panel-label">Ziepher AI</span>
        <h1>You are offline</h1>
        <p>
          Your saved interface is available, but planning, building, previews,
          and project sync need an internet connection because the secure build
          engine runs in the Ziepher cloud.
        </p>
        <Link className="button primary" href="/">
          Try again
        </Link>
      </section>
    </main>
  );
}
