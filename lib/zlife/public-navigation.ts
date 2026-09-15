export const zlifePublicNavigation = [
  { label: "Home", href: "/" },
  { label: "Builder", href: "/auth/sign-in?next=/projects" },
  { label: "About", href: "/about" },
  { label: "Our Vision", href: "/vision" },
  { label: "Community", href: "/community" }
] as const;

export const zlifePublicCta = {
  label: "Build My Website or App",
  href: "/auth/sign-in?next=/projects"
} as const;

export const zlifePublicRoutes = zlifePublicNavigation.map((item) => item.href);
