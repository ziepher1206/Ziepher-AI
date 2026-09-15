"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const signedInPrefixes = ["/dashboard", "/assistant", "/operate", "/home", "/services", "/projects", "/settings"];

const navItems = [
  { label: "Home", href: "/dashboard", icon: "⌂" },
  { label: "My Day", href: "/dashboard", icon: "☷" },
  { label: "Ask Z-Life", href: "/assistant", icon: "⌁", primary: true },
  { label: "Modules", href: "/dashboard/modules", icon: "▦" },
  { label: "More", href: "/settings", icon: "•••" }
] as const;

export function ZLifeMobileBottomNav() {
  const pathname = usePathname();
  if (!signedInPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;

  return (
    <nav
      aria-label="Z-Life mobile navigation"
      style={{
        position: "fixed",
        zIndex: 80,
        left: "max(10px, env(safe-area-inset-left))",
        right: "max(10px, env(safe-area-inset-right))",
        bottom: "max(10px, env(safe-area-inset-bottom))",
        display: "grid",
        gridTemplateColumns: "repeat(5,minmax(0,1fr))",
        gap: 4,
        padding: 7,
        border: "1px solid rgba(78,234,221,.28)",
        borderRadius: 20,
        background: "rgba(2,9,11,.94)",
        boxShadow: "0 16px 55px rgba(0,0,0,.48),0 0 24px rgba(20,224,209,.08)",
        backdropFilter: "blur(18px)"
      }}
      className="zlife-mobile-bottom-nav"
    >
      {navItems.map((item) => {
        const active = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={{
              minWidth: 0,
              minHeight: 48,
              display: "grid",
              placeItems: "center",
              alignContent: "center",
              gap: 2,
              borderRadius: 14,
              textDecoration: "none",
              border: item.primary ? "1px solid rgba(56,224,243,.45)" : "1px solid transparent",
              background: item.primary ? "linear-gradient(135deg,rgba(56,224,243,.17),rgba(16,217,129,.13))" : active ? "rgba(56,224,243,.08)" : "transparent",
              color: item.primary || active ? "#7fffd4" : "#89aaa6",
              boxShadow: item.primary ? "0 0 22px rgba(56,224,243,.10)" : "none"
            }}
          >
            <span aria-hidden="true" style={{ fontSize: item.primary ? 20 : 16, lineHeight: 1 }}>{item.icon}</span>
            <small style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9, fontWeight: item.primary ? 800 : 650 }}>{item.label}</small>
          </Link>
        );
      })}
    </nav>
  );
}
