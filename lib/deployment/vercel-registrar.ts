import "server-only";

const VERCEL_API_ORIGIN = "https://api.vercel.com";

export type DomainPriceDisplay = {
  amount: string;
  currency: string | null;
};

export type VercelDomainSuggestion = {
  domain: string;
  available: boolean;
  purchasePrice: DomainPriceDisplay | null;
  renewalPrice: DomainPriceDisplay | null;
  years: number | null;
};

type AvailabilityResponse = {
  results?: Array<{ domain?: unknown; available?: unknown }>;
};

type PriceResponse = {
  years?: unknown;
  purchasePrice?: unknown;
  renewalPrice?: unknown;
};

function requestUrl(pathname: string, teamId?: string | null) {
  const url = new URL(pathname, VERCEL_API_ORIGIN);
  if (teamId?.trim()) url.searchParams.set("teamId", teamId.trim());
  return url;
}

async function vercelJson<T>(
  accessToken: string,
  url: URL,
  init: RequestInit = {}
): Promise<T> {
  const token = accessToken.trim();
  if (!token) throw new Error("A connected Vercel access token is required.");

  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      "content-type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Vercel domain access was denied. Reconnect Vercel or grant registrar access."
      );
    }
    if (response.status === 429) {
      throw new Error("Vercel domain search is temporarily rate limited. Try again shortly.");
    }
    throw new Error(`Vercel registrar request failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
}

function priceDisplay(value: unknown): DomainPriceDisplay | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { amount: String(value), currency: null };
  }
  if (typeof value === "string" && value.trim()) {
    return { amount: value.trim(), currency: null };
  }
  if (!value || typeof value !== "object") return null;

  const object = value as Record<string, unknown>;
  const formatted = object.formatted;
  if (typeof formatted === "string" && formatted.trim()) {
    return {
      amount: formatted.trim(),
      currency: typeof object.currency === "string" ? object.currency : null
    };
  }

  const rawAmount = object.amount ?? object.value ?? object.price;
  if (
    (typeof rawAmount === "number" && Number.isFinite(rawAmount)) ||
    (typeof rawAmount === "string" && rawAmount.trim())
  ) {
    return {
      amount: String(rawAmount),
      currency: typeof object.currency === "string" ? object.currency : null
    };
  }

  return null;
}

export async function checkVercelDomains(input: {
  accessToken: string;
  domains: string[];
  teamId?: string | null;
}) {
  const domains = [...new Set(input.domains.map((domain) => domain.toLowerCase()))].slice(
    0,
    20
  );
  if (!domains.length) return [];

  const availability = await vercelJson<AvailabilityResponse>(
    input.accessToken,
    requestUrl("/v1/registrar/domains/availability", input.teamId),
    {
      method: "POST",
      body: JSON.stringify({ domains })
    }
  );

  const availabilityByDomain = new Map<string, boolean>();
  for (const result of availability.results ?? []) {
    if (typeof result.domain !== "string" || typeof result.available !== "boolean") {
      continue;
    }
    availabilityByDomain.set(result.domain.toLowerCase(), result.available);
  }

  return Promise.all(
    domains.map(async (domain): Promise<VercelDomainSuggestion> => {
      const available = availabilityByDomain.get(domain) ?? false;
      if (!available) {
        return {
          domain,
          available: false,
          purchasePrice: null,
          renewalPrice: null,
          years: null
        };
      }

      try {
        const price = await vercelJson<PriceResponse>(
          input.accessToken,
          requestUrl(
            `/v1/registrar/domains/${encodeURIComponent(domain)}/price`,
            input.teamId
          )
        );
        return {
          domain,
          available: true,
          purchasePrice: priceDisplay(price.purchasePrice),
          renewalPrice: priceDisplay(price.renewalPrice),
          years:
            typeof price.years === "number" && Number.isFinite(price.years)
              ? price.years
              : typeof price.years === "string" && Number.isFinite(Number(price.years))
                ? Number(price.years)
                : null
        };
      } catch {
        return {
          domain,
          available: true,
          purchasePrice: null,
          renewalPrice: null,
          years: null
        };
      }
    })
  );
}
