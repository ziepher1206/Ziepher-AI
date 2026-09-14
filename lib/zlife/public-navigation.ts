export const zlifePublicNavigation = [
  { label: "Home", href: "/" },
  { label: "AI Teams", href: "/ai-teams" },
  { label: "Modules", href: "/modules" },
  { label: "About", href: "/about" },
  { label: "Our Vision", href: "/vision" },
  { label: "Community", href: "/community" }
] as const;

export const zlifePublicCta = { label: "Open Z-Life", href: "/auth/sign-in" } as const;

export const zlifePublicRoutes = zlifePublicNavigation.map((item) => item.href);
