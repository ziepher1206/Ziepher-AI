import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ziepher AI — Build Your Dreams",
    short_name: "Ziepher AI",
    description:
      "Plan, design, build, test, and launch complete applications with voice, visuals, and AI.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#090b12",
    theme_color: "#090b12",
    categories: ["productivity", "developer", "design"],
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
        name: "Start a new app",
        short_name: "New app",
        description: "Open Ziepher AI and start planning a new application.",
        url: "/?new=1",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "My projects",
        short_name: "Projects",
        description: "Open saved Ziepher AI projects.",
        url: "/projects",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }]
      }
    ]
  };
}
