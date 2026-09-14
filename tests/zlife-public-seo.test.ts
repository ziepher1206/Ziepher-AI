import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("ZLife public SEO boundaries", () => {
  it("uses one canonical public origin", () => {
    const source = read("lib/zlife/public-origin.ts");

    expect(source).toContain('export const ZLIFE_PUBLIC_ORIGIN = "https://ziepher-ai.vercel.app";');
  });

  it("builds the public sitemap from the canonical module registry", () => {
    const source = read("app/sitemap.ts");

    expect(source).toContain('import { zlifeModules } from "@/lib/zlife/modules";');
    expect(source).toContain('url: `${ZLIFE_PUBLIC_ORIGIN}/modules/${module.slug}`');
    expect(source).toContain('url: `${ZLIFE_PUBLIC_ORIGIN}/community`');
    expect(source).not.toContain("/team");
    expect(source).not.toContain("/operate");
    expect(source).not.toContain("/projects");
  });

  it("keeps authenticated application surfaces out of the crawl boundary", () => {
    const source = read("app/robots.ts");

    expect(source).toContain('allow: ["/", "/community", "/modules/"]');
    expect(source).toContain('"/api/"');
    expect(source).toContain('"/auth/"');
    expect(source).toContain('"/operate/"');
    expect(source).toContain('"/projects/"');
    expect(source).toContain('"/team"');
    expect(source).toContain('sitemap: `${ZLIFE_PUBLIC_ORIGIN}/sitemap.xml`');
  });

  it("generates canonical metadata for public module pages", () => {
    const source = read("app/modules/[slug]/page.tsx");

    expect(source).toContain("export async function generateMetadata");
    expect(source).toContain('const selectedModule = zlifeModuleBySlug.get(slug);');
    expect(source).toContain('const url = `${ZLIFE_PUBLIC_ORIGIN}/modules/${selectedModule.slug}`;');
    expect(source).toContain("alternates: { canonical: url }");
    expect(source).toContain("openGraph:");
  });
});
