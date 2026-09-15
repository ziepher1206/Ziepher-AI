export type ZLifeModuleStatus = "active" | "launch" | "development";

export type ZLifeModuleDefinition = {
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  status: ZLifeModuleStatus;
  summary: string;
  capabilities: string[];
  launchHref?: string;
  nestedLabel?: string;
};

export function zlifeModuleStatusLabel(status: ZLifeModuleStatus) {
  if (status === "active") return "Active Module";
  if (status === "launch") return "Launch Focus";
  return "In Development";
}

export function zlifeModuleStatusShortLabel(status: ZLifeModuleStatus) {
  if (status === "active") return "ACTIVE";
  if (status === "launch") return "LAUNCHING";
  return "BUILDING";
}

export const zlifeModules: ZLifeModuleDefinition[] = [
  { slug: "business", name: "Z-Life Business", shortName: "Business", icon: "▣", description: "One adaptive operating system for service businesses.", status: "active", summary: "Run day-to-day service-business operations inside one connected workspace. The shared engine covers leads, estimates, scheduling, jobs, customers, invoices, payments, growth, documents, and AI guidance; an industry profile changes the trade-specific fields, terminology, recommendations, and workflow details layered on top.", capabilities: ["One shared business engine instead of separate apps for every trade", "Leads, customers, estimates, scheduling, crews, jobs, invoices, payments, and growth workflows", "Industry-profile layer for trade-specific fields, pricing context, terminology, recommendations, and automation", "Tree Service as the first active industry profile, with Pressure Washing, Landscaping, Lawn Care, Cleaning, HVAC, Plumbing, Snow Removal, Roofing, Handyman, and more following the same architecture", "Shared account, permissions, audit history, provider boundaries, and Z-Life AI context"], launchHref: "/operate", nestedLabel: "Tree Service · First active industry profile" },
  { slug: "assistant", name: "Z-Life AI Assistant", shortName: "AI Assistant", icon: "◎", description: "Your always-on AI teammate for life and business.", status: "active", summary: "The central front door to Z-Life. Start with one request, use zero-cost routing where possible, and move into the connected module or deeper AI workflow without learning where every tool lives.", capabilities: ["One entry point across life and business", "Zero-cost routing before paid model use", "Daily priorities and direct links into connected workflows", "Clear labels when a requested area is not connected or still in development", "Sensitive and paid actions remain approval-gated"], launchHref: "/assistant" },
  { slug: "web-builder", name: "Z-Life AI Web Builder", shortName: "AI Web Builder", icon: "▤", description: "Build, improve, and manage websites with AI.", status: "launch", summary: "Create or connect websites, upload visual references, review generated previews, refine the design in plain language, choose a domain, and move through safe approval-based publishing.", capabilities: ["Describe the website you want in plain language", "Upload screenshots, photos, logos, and design references", "Generate, inspect, and refine responsive previews", "Scan existing websites and turn findings into visual improvement directions", "Move through domain selection and publish readiness without silent purchases or releases"], launchHref: "/projects" },
  { slug: "app-builder", name: "Z-Life AI App Builder", shortName: "AI App Builder", icon: "⌘", description: "Turn an idea into working software with AI.", status: "launch", summary: "Plan, generate, test, preview, and iterate on applications while preserving source control, visual QA, and explicit release gates.", capabilities: ["Describe an app idea and desired experience", "Upload reference screens and product imagery", "Generate source-controlled application builds", "Review visual quality and request changes in plain language", "Keep deployment and production release behind explicit approval"], launchHref: "/projects" },
  { slug: "home", name: "Z-Life Home & Family", shortName: "Home & Family", icon: "⌂", description: "A smarter, simpler home and family life.", status: "development", summary: "A shared home-and-family workspace for household tasks, reminders, recurring maintenance, projects, schedules, records, and the information people choose to manage together. The first working slice now covers tasks and home-maintenance memory.", capabilities: ["Household tasks, priorities, due dates, and completion tracking", "Recurring home-maintenance items, cadence, location, and next-due tracking", "Shared workspace boundaries ready for family schedules, records, reminders, and cross-module connections"], launchHref: "/home", nestedLabel: "Working foundation · Tasks + maintenance" },
  { slug: "money", name: "Z-Life Money", shortName: "Money", icon: "$", description: "Clarity for today. Freedom for tomorrow.", status: "development", summary: "A future financial-organization module focused on costs, plans, and money workflows with explicit approval boundaries.", capabilities: ["Cost and budget visibility", "Connected financial organization where authorized", "Clear approval boundaries for paid or financial actions"] },
  { slug: "auto", name: "Z-Life Auto", shortName: "Auto", icon: "◇", description: "Everything for the road ahead.", status: "development", summary: "A future vehicle-management module for maintenance, documents, service history, costs, and reminders.", capabilities: ["Vehicle records and maintenance history", "Service and reminder tracking", "Cost visibility and documentation"] },
  { slug: "documents", name: "Z-Life Documents", shortName: "Documents", icon: "▱", description: "Find it. Use it. Keep it safe.", status: "development", summary: "A future document organization layer for locating, categorizing, and safely connecting important files across Z-Life.", capabilities: ["Searchable document organization", "Permission-aware access", "Workflow-to-document connections"] },
  { slug: "health", name: "Z-Life Health", shortName: "Health", icon: "♡", description: "A healthier, happier you.", status: "development", summary: "A future health and wellness organization module for information and routines users explicitly choose to connect.", capabilities: ["Personal wellness organization", "Connected records where explicitly authorized", "Clear privacy and permission boundaries"] },
  { slug: "travel", name: "Z-Life Travel", shortName: "Travel", icon: "✈", description: "Plan more. Experience more.", status: "development", summary: "A future trip-planning module for itineraries, reservations, documents, tasks, and shared travel details.", capabilities: ["Trip and itinerary organization", "Reservation and document references", "Shared planning with explicit permissions"] },
  { slug: "learning", name: "Z-Life Learning", shortName: "Learning", icon: "⌑", description: "Feed your curiosity. Build your future.", status: "development", summary: "A future learning workspace for goals, study plans, saved resources, and progress tracking.", capabilities: ["Learning goals and plans", "Saved resources", "Progress organization"] },
  { slug: "services", name: "Z-Life Services", shortName: "Services", icon: "↗", description: "Find. Book. Get things done.", status: "development", summary: "A connected service-request workspace that keeps the user's request history in ZLife while marketplace matching remains behind an explicit Ziepher Match service boundary.", capabilities: ["Create and track service requests inside the signed-in ZLife workspace", "Preserve request history and future marketplace attribution without copying the Match database", "Explicit provider bridge for matching and in-person inspection status with billable events kept approval-controlled"], launchHref: "/services", nestedLabel: "Working foundation · Service requests" }
];

export const zlifeModuleBySlug = new Map(zlifeModules.map((module) => [module.slug, module]));
