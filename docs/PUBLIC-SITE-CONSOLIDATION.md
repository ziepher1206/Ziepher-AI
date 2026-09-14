# ZLife public-site consolidation

## Canonical source

The public ZLife experience and the ZLife application share one source of truth:

- GitHub: `ziepher1206/Ziepher-AI`
- Vercel project: `ziepher-ai`
- Product: **ZLife by Ziepher Tech**
- First active business vertical: **Tree Service**

The legacy `ziepher-tech-homepage` repository is preserved as historical source only. It should not continue evolving as a competing public homepage.

## Public-domain target

After the consolidated homepage is green on `main` and verified on the `ziepher-ai` production deployment, move these domains from the legacy Vercel project to the canonical `ziepher-ai` project:

- `ziephertech.com`
- `www.ziephertech.com`

Do not switch the domains before the exact candidate deployment is READY and manually checked.

## Consolidated homepage requirements

The canonical homepage includes:

- ZLife positioning and hero
- dedicated AI support by area rather than a gallery of human team photos
- ZLife modules with Tree Service visibly active inside Business
- Home & Family as one module
- founder/about story
- no founder portrait requirement; the founder story works without human photography
- public community contribution path
- Proof of Value / contribution-economy explanation with simulation-only legal boundaries
- Ziepher Tech company relationship and current build/service entry points

## Cutover verification

Before domain cutover:

1. `main` CI is green.
2. Vercel production deployment for the exact `main` SHA is READY.
3. `/` shows the founder story and consolidated public sections.
4. `/community` works and links to contributor onboarding.
5. module pages resolve and Back navigation returns naturally.
6. no production secrets are exposed client-side.
7. the legacy homepage remains available only as rollback/reference until cutover is stable.

After cutover, verify both apex and `www` resolve to the canonical ZLife deployment before treating consolidation as complete.
