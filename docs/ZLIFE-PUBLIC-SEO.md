# ZLife public SEO baseline

Verified public production origin: `https://ziepher-ai.vercel.app`.

Current public surfaces include the landing page, Community, Team, and the canonical module explanation routes under `/modules/[slug]`. Authenticated application surfaces such as Operate, Projects, Settings, and Community Review should remain separate from public discovery metadata.

## Next safe implementation steps

1. Add page-level metadata for module explanation pages using the canonical module registry.
2. Add public sitemap coverage for the landing page, Community, Team, and module explanation routes.
3. Keep authenticated/server-only paths out of crawler discovery guidance.
4. Add regression tests that derive module URLs from `lib/zlife/modules.ts` so navigation and SEO cannot drift apart.

Do not include unfinished product claims, private workspace routes, API endpoints, secrets, or customer data in public metadata.
