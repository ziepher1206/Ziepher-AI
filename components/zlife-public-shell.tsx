import Link from "next/link";
import type { ReactNode } from "react";
import { zlifePublicCta, zlifePublicNavigation } from "@/lib/zlife/public-navigation";

function ZMark() {
  return (
    <span className="zlife-mark" aria-hidden="true">
      <span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span>
    </span>
  );
}

export function ZLifePublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="zlife-landing">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home"><ZMark /><small>by Ziepher Tech</small></Link>
        <nav aria-label="Primary navigation">
          {zlifePublicNavigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
        </nav>
        <Link className="zlife-nav-cta" href={zlifePublicCta.href}>{zlifePublicCta.label}</Link>
      </header>
      <nav className="zlife-mobile-public-nav" aria-label="Mobile navigation">
        {zlifePublicNavigation.filter((item) => item.href !== "/").map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
      {children}
      <footer className="zlife-footer">
        <div className="zlife-footer-brand"><ZMark /><small>by Ziepher Tech</small><p>Technology for a more human tomorrow.</p></div>
        <div className="zlife-footer-links">{zlifePublicNavigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</div>
        <div className="zlife-footer-mantra"><strong>PEOPLE</strong><strong>TOOLS</strong><strong>PROGRESS</strong><span>A BRIGHTER TOMORROW</span></div>
      </footer>
    </main>
  );
}
