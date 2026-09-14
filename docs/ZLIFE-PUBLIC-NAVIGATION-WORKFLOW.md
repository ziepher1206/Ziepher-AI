# ZLife Public Website Navigation Workflow

This document is the pre-build navigation contract for the public ZLife website. The public marketing experience must be multi-page, mobile-first, and purpose-driven rather than one endless scrolling page.

## Primary navigation

- Home → `/`
- AI Teams → `/ai-teams`
- Modules → `/modules`
- About → `/about`
- Our Vision → `/vision`
- Community → `/community`
- Open Z-Life → `/auth/sign-in`

## Page responsibilities

### Home `/`
Purpose: explain ZLife quickly, establish the Ziepher Tech relationship, show the main product areas, and route visitors to deeper pages.

Home should contain only a concise hero, short platform summary, active-module callout, AI support overview, founder teaser, community teaser, and clear CTAs. It should not duplicate full page content.

### AI Teams `/ai-teams`
Purpose: explain the specialized AI support areas without a human-style “meet the team” presentation.

Areas: Business, Home & Family, Money, Health & Wellness, Builders & Technology, Services & Everyday Needs.

### Modules `/modules`
Purpose: show all ZLife modules in one organized directory. Each module links to its dedicated `/modules/[slug]` page.

Tree Service remains the first active business vertical inside ZLife Business. AI Assistant remains active.

### About `/about`
Purpose: founder story, Ziepher Tech relationship, background from tattooing to tree service to AI building, and why ZLife exists.

### Our Vision `/vision`
Purpose: explain the long-term “one connected platform” goal, how modules/AI support work together, and the simpler-digital-world mission.

### Community `/community`
Purpose: contribution pathways, Proof of Value, contributor workflow, open tasks, governance, and community participation.

## Module navigation contract

Each `/modules/[slug]` page must:

1. explain that module’s purpose and status;
2. show active/in-development state clearly;
3. provide direct back navigation to `/modules`;
4. preserve normal browser back behavior so users return to the page they came from rather than being forced through a workflow;
5. expose module-specific actions only when they are actually available.

## Required navigation workflows to test before UI build

1. Home → Modules → Tree Service module → Back → Modules.
2. Home → AI Teams → Back → Home.
3. Home → About → Vision → Community → Home using persistent navigation.
4. Any public page → Open Z-Life → sign-in.
5. Mobile navigation exposes the same destinations as desktop navigation.
6. No primary public navigation item points to an in-page `#section` anchor.
7. Module cards link to dedicated module pages instead of expanding the homepage.
8. Browser back remains natural; no forced carousel/cycle behavior.

## Build rule

The route map and navigation contract tests are created before the page UI is split. The implementation is not considered complete until navigation tests, typecheck, lint, production build, and mobile navigation checks pass.
