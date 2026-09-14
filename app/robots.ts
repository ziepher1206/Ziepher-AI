import type { MetadataRoute } from "next";

import { ZLIFE_PUBLIC_ORIGIN } from "@/lib/zlife/public-origin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/ai-teams", "/modules", "/modules/", "/about", "/vision", "/community"],
      disallow: [
        "/api/",
        "/auth/",
        "/operate/",
        "/projects/",
        "/team",
        "/settings/",
      ],
    },
    sitemap: `${ZLIFE_PUBLIC_ORIGIN}/sitemap.xml`,
    host: ZLIFE_PUBLIC_ORIGIN,
  };
}
