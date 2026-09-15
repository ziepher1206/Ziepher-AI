"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./zlife-mobile-bottom-nav.module.css";

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
    <>
      <div aria-hidden="true" className={styles.spacer} />
      <nav aria-label="Z-Life mobile navigation" className={styles.nav}>
        {navItems.map((item) => {
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const className = [
            styles.item,
            active ? styles.itemActive : "",
            item.primary ? styles.itemPrimary : ""
          ].filter(Boolean).join(" ");

          return (
            <Link key={`${item.label}-${item.href}`} href={item.href} aria-current={active ? "page" : undefined} className={className}>
              <span aria-hidden="true" className={styles.icon}>{item.icon}</span>
              <small className={styles.label}>{item.label}</small>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
