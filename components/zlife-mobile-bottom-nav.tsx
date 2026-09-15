"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./zlife-mobile-bottom-nav.module.css";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  primary?: boolean;
};

const signedInPrefixes = ["/dashboard", "/today", "/assistant", "/operate", "/home", "/services", "/projects", "/settings"];

const navItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "⌂" },
  { label: "Ask Z-Life", href: "/assistant", icon: "⌁", primary: true },
  { label: "My Day", href: "/today", icon: "☷" }
];

export function ZLifeMobileBottomNav() {
  const pathname = usePathname();
  if (!signedInPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;

  return (
    <>
      <div aria-hidden="true" className={styles.spacer} />
      <nav aria-label="Z-Life mobile navigation" className={styles.nav}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
