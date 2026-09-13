import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type HealthCheck = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type WebsiteHealth = {
  score: number;
  scannedUrl: string;
  statusCode: number;
  title: string | null;
  description: string | null;
  h1Count: number;
  checks: HealthCheck[];
  recommendations: string[];
};

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase();
  if (isIP(address) !== 6) return true;
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

async function assertPublicUrl(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS websites can be scanned.");
  }
  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || isIP(hostname)) {
    throw new Error("The website must use a public domain name.");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The website domain does not resolve to a public address.");
  }
}

async function fetchPublicPage(input: string) {
  let current = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);

  for (let redirect = 0; redirect <= 4; redirect += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        "user-agent": "SiteRefiner/1.0 (+https://ziephertech.com/siterefiner)",
        accept: "text/html,application/xhtml+xml"
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store"
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Website returned an invalid redirect.");
      current = new URL(location, current);
      continue;
    }

    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("The website did not return an HTML page.");
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > 2_000_000) throw new Error("Homepage is too large to scan safely.");

    const html = (await response.text()).slice(0, 2_000_000);
    return { html, response, url: current.toString() };
  }

  throw new Error("Website redirected too many times.");
}

function firstMatch(html: string, expression: RegExp) {
  const match = html.match(expression);
  return match?.[1]?.replace(/\s+/g, " ").trim() || null;
}

function countMatches(html: string, expression: RegExp) {
  return [...html.matchAll(expression)].length;
}

export async function scanWebsite(domain: string): Promise<WebsiteHealth> {
  const { html, response, url } = await fetchPublicPage(domain);
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) ??
    firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const h1Count = countMatches(html, /<h1\b[^>]*>/gi);
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasCanonical = /<link[^>]+rel=["'][^"']*canonical[^"']*["']/i.test(html);
  const hasStructuredData = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  const hasForm = /<form\b/i.test(html);
  const hasPhoneLink = /href=["']tel:/i.test(html);
  const hasHttps = new URL(url).protocol === "https:";
  const imageCount = countMatches(html, /<img\b[^>]*>/gi);
  const imageWithAltCount = countMatches(html, /<img\b[^>]*\balt=["'][^"']*["'][^>]*>/gi);
  const missingAlt = Math.max(0, imageCount - imageWithAltCount);

  const checks: HealthCheck[] = [
    { key: "https", label: "Secure HTTPS", passed: hasHttps, detail: hasHttps ? "Homepage uses HTTPS." : "Homepage is not using HTTPS." },
    { key: "title", label: "Page title", passed: Boolean(title && title.length >= 10), detail: title ? `${title.length} characters.` : "No page title detected." },
    { key: "description", label: "Meta description", passed: Boolean(description && description.length >= 50), detail: description ? `${description.length} characters.` : "No meta description detected." },
    { key: "viewport", label: "Mobile viewport", passed: hasViewport, detail: hasViewport ? "Viewport metadata detected." : "No mobile viewport metadata detected." },
    { key: "h1", label: "Primary heading", passed: h1Count === 1, detail: `${h1Count} H1 heading${h1Count === 1 ? "" : "s"} detected.` },
    { key: "canonical", label: "Canonical URL", passed: hasCanonical, detail: hasCanonical ? "Canonical link detected." : "No canonical link detected on the homepage." },
    { key: "structured-data", label: "Structured data", passed: hasStructuredData, detail: hasStructuredData ? "JSON-LD structured data detected." : "No JSON-LD structured data detected." },
    { key: "conversion", label: "Conversion path", passed: hasForm || hasPhoneLink, detail: hasForm || hasPhoneLink ? "A form or phone CTA was detected." : "No form or phone CTA detected on the homepage." },
    { key: "image-alt", label: "Image alt text", passed: missingAlt === 0, detail: imageCount ? `${missingAlt} of ${imageCount} images appear to be missing alt text.` : "No homepage images detected." }
  ];

  const recommendations = checks
    .filter((check) => !check.passed)
    .map((check) => {
      switch (check.key) {
        case "title": return "Write a clearer search-focused page title that names the business and primary service.";
        case "description": return "Add a useful meta description that explains the business and encourages qualified clicks.";
        case "viewport": return "Add correct mobile viewport metadata and verify responsive behavior.";
        case "h1": return "Use one clear H1 that communicates the primary customer outcome.";
        case "canonical": return "Add a canonical URL to reduce duplicate-indexing ambiguity.";
        case "structured-data": return "Add appropriate structured data for the business and services.";
        case "conversion": return "Make the primary call, estimate, booking, or contact action obvious on the homepage.";
        case "image-alt": return "Add descriptive alt text to meaningful images for accessibility and search context.";
        case "https": return "Serve the website over HTTPS before publishing customer-facing changes.";
        default: return check.detail;
      }
    });

  const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);

  return {
    score,
    scannedUrl: url,
    statusCode: response.status,
    title,
    description,
    h1Count,
    checks,
    recommendations
  };
}
