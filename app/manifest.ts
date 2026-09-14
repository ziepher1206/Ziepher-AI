import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Z-Life — Built by Ziepher Tech",
    short_name: "Z-Life",
    description:
      "One connected app for business, home, family, money, services, documents, scheduling, growth, analytics, and AI assistance.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#090b12",
    theme_color: "#090b12",
    categories: ["productivity", "business", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "Today",
        short_name: "Today",
        description: "Open your Z-Life Today view.",
        url: "/operate",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Business",
        short_name: "Business",
        description: "Open Z-Life Business.",
        url: "/operate",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }]
      }
    ]
  };
}
