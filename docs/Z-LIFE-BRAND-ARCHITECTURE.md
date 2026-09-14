# Z-Life Product Architecture

## Brand hierarchy

- **Ziepher Tech** is the parent company that builds and operates the product.
- **Z-Life** is the main customer-facing app.
- Z-Life is organized into modules so new capabilities can be added without creating disconnected standalone products.

## Initial module structure

### Z-Life Today
A cross-module attention layer that eventually surfaces the most important items from business, home, family, money, vehicles, services, documents, and other connected areas.

### Z-Life AI
The assistant/orchestration layer. It should help users understand what needs attention, prepare actions, fill in information, summarize activity, and coordinate work across modules while respecting approval and permission boundaries.

### Z-Life Business
The business operating module. The first industry configuration is **Tree Service**.

Current Tree Service priorities remain:

Lead → estimate request → available appointment windows → business approval → estimate → customer acceptance → job → crew scheduling → completion → invoice → payment → review/follow-up.

The experience should minimize re-entry and unnecessary forms. Information captured once should flow forward automatically.

### Future Z-Life modules

Planned module families include Home, Family, Money, Auto, Services, Documents, and other life-management capabilities. These are product directions, not claims of currently finished functionality.

## Naming rules

1. Customer-facing app branding should use **Z-Life**.
2. Company attribution should use **Built by Ziepher Tech** where useful.
3. Infrastructure identifiers such as the existing GitHub repository, Supabase project, Vercel project, environment variables, database objects, and stable API contracts should not be renamed merely for appearance.
4. Existing internal Ziepher/legacy identifiers may remain when changing them would introduce migration risk.
5. New modules should be named as parts of Z-Life rather than automatically becoming separate products.

## Agent workflow

Substantial Z-Life work should be reviewed through the Ziepher Tech agent-team roles. The engineering workflow remains branch → implementation → checks/preview → review → merge. Security, QA, independent review, and release-management roles retain blocker authority. Paid/live agent execution remains permission-gated and must not be silently enabled.

## Safety and approval boundaries

No real charges, customer communications, public social posts, paid campaigns, provider upgrades, destructive database actions, or major infrastructure/domain cutovers should happen without the required approval.
