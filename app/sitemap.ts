import type { MetadataRoute } from "next";

import { zlifeModules } from "@/lib/zlife/modules";
import { ZLIFE_PUBLIC_ORIGIN } from "@/lib/zlife/public-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const moduleRoutes = zlifeModules.map((module) => ({
    url: `${ZLIFE_PUBLIC_ORIGIN}/modules/${module.slug}`,
    changeFrequency: "weekly" as const,
    priority: module.status === "active" ? 0.9 : 0.6,
  }));

  return [
    {
      url: ZLIFE_PUBLIC_ORIGIN,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${ZLIFE_PUBLIC_ORIGIN}/community`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...moduleRoutes,
  ];
}
