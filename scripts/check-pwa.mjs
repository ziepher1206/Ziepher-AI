import { access, readFile } from "node:fs/promises";

const required = [
  "app/manifest.ts",
  "public/sw.js",
  "public/icon-192.png",
  "public/icon-512.png",
  "public/icon-512-maskable.png",
  "components/pwa-install.tsx",
  "app/offline/page.tsx"
];

await Promise.all(required.map((file) => access(file)));

const worker = await readFile("public/sw.js", "utf8");
for (const privatePath of ["/api/", "/auth/", "/projects/"]) {
  if (!worker.includes(privatePath)) {
    throw new Error(`Service worker must explicitly exclude ${privatePath}`);
  }
}

if (worker.includes('caches.addAll(["/"]')) {
  throw new Error("Do not cache the authenticated application root.");
}

console.log("PWA install surface and private-cache protections verified.");
