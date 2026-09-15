const stopWords = new Set([
  "the",
  "and",
  "of",
  "a",
  "an",
  "llc",
  "inc",
  "company",
  "co"
]);

function cleanWords(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !stopWords.has(word));
}

function compact(value: string) {
  return cleanWords(value).join("").slice(0, 48);
}

function cityToken(value?: string | null) {
  if (!value) return "";
  return cleanWords(value)[0]?.slice(0, 20) ?? "";
}

function industryToken(value?: string | null) {
  if (!value) return "";
  const words = cleanWords(value);
  return words.slice(0, 2).join("").slice(0, 24);
}

export function generateDomainCandidates(input: {
  name: string;
  businessName?: string | null;
  location?: string | null;
  industry?: string | null;
  projectType?: "website" | "app" | null;
  limit?: number;
}) {
  const source = input.businessName?.trim() || input.name.trim();
  const base = compact(source) || "newproject";
  const city = cityToken(input.location);
  const industry = industryToken(input.industry);
  const app = input.projectType === "app";

  const stems = [
    base,
    app ? `get${base}` : `my${base}`,
    app ? `${base}app` : `${base}online`,
    industry && !base.includes(industry) ? `${base}${industry}` : "",
    city && !base.includes(city) ? `${base}${city}` : "",
    city && industry ? `${city}${industry}` : ""
  ].filter(Boolean);

  const domains: string[] = [];
  for (const stem of stems) {
    for (const tld of ["com", app ? "app" : "net", "co"]) {
      const domain = `${stem}.${tld}`;
      if (!domains.includes(domain)) domains.push(domain);
    }
  }

  return domains.slice(0, Math.max(1, Math.min(input.limit ?? 10, 20)));
}
