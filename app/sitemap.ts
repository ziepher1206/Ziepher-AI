import type { MetadataRoute } from "next";

import { zlifeModules } from "@/lib/zlife/modules";
import { zlifePublicRoutes } from "@/lib/zlife/public-navigation";
import { ZLIFE_PUBLIC_ORIGIN } from "@/lib/zlife/public-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = zlifePublicRoutes.map((route) => ({
    url: route === "/" ? ZLIFE_PUBLIC_ORIGIN : `${ZLIFE_PUBLIC_ORIGIN}${route}`,
    changeFrequency: "weekly" as const,
    priority: route === "/" ? 1 : route === "/modules" ? 0.9 : 0.8,
  }));

  const moduleRoutes = zlifeModules.map((module) => ({
    url: `${ZLIFE_PUBLIC_ORIGIN}/modules/${module.slug}`,
    changeFrequency: "weekly" as const,
    priority: module.status === "active" ? 0.9 : 0.6,
  }));

  return [...publicRoutes, ...moduleRoutes];
}
