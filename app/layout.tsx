import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ziepher-theme.css";

export const metadata: Metadata = {
  applicationName: "Ziepher",
  title: {
    default: "Ziepher — Business Operating Platform",
    template: "%s · Ziepher"
  },
  description:
    "Ziepher brings business operations, scheduling, estimates, jobs, invoicing, growth, analytics, and AI assistance into one platform.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ziepher"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#090b12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
