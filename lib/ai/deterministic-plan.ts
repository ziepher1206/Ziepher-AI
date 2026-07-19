import type { AppPlan } from "./types";

function titleFromIdea(idea: string) {
  const cleaned = idea
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return words
    ? `${words.charAt(0).toUpperCase()}${words.slice(1)}`
    : "New application";
}

export function createDeterministicPlan(idea: string): AppPlan {
  const title = titleFromIdea(idea);

  return {
    title,
    summary: `A complete application based on this idea: ${idea}. The build will start with visual planning, then create the core experience, data model, authentication, testing, and finally any financial integrations.`,
    targetUsers: ["Primary customers", "Application administrators"],
    features: [
      {
        name: "Guided onboarding",
        description:
          "Help first-time users understand the product and reach the main outcome quickly.",
        priority: "must"
      },
      {
        name: "Core user workflow",
        description:
          "Deliver the main job the user is hiring the application to perform.",
        priority: "must"
      },
      {
        name: "Secure accounts",
        description:
          "Support authentication, profile management, and role-based access.",
        priority: "must"
      },
      {
        name: "Admin workspace",
        description:
          "Manage users, content, settings, and operational activity.",
        priority: "must"
      },
      {
        name: "Responsive experience",
        description:
          "Work clearly across desktop, tablet, and mobile screen sizes.",
        priority: "must"
      },
      {
        name: "Activity and notifications",
        description:
          "Show important updates and keep users informed about progress.",
        priority: "should"
      }
    ],
    screens: [
      { name: "Landing", purpose: "Explain value and begin onboarding" },
      { name: "Sign in", purpose: "Securely authenticate users" },
      { name: "Main workspace", purpose: "Complete the central user workflow" },
      { name: "Profile", purpose: "Manage personal settings" },
      { name: "Admin", purpose: "Manage application operations" }
    ],
    visualDirections: [
      {
        id: "quiet-premium",
        name: "Quiet Premium",
        description:
          "Spacious layouts, restrained color, and polished editorial typography."
      },
      {
        id: "bold-future",
        name: "Bold Future",
        description:
          "High-impact gradients, layered surfaces, and energetic motion."
      },
      {
        id: "warm-friendly",
        name: "Warm and Friendly",
        description:
          "Rounded components, approachable language, and comfortable colors."
      },
      {
        id: "pro-dashboard",
        name: "Professional Dashboard",
        description:
          "Strong hierarchy, efficient navigation, and information-rich views."
      }
    ],
    buildPhases: [
      {
        name: "Visual planning",
        outcome:
          "Requirements, user flows, data model, and chosen visual direction",
        billable: false
      },
      {
        name: "Core application",
        outcome: "Frontend, backend, database, authentication, and permissions",
        billable: true
      },
      {
        name: "Complete feature build",
        outcome: "All approved workflows and integrations except live money",
        billable: true
      },
      {
        name: "Testing and repair",
        outcome:
          "Build, type, test, security, responsive, and visual checks pass",
        billable: true
      },
      {
        name: "Financial integrations last",
        outcome:
          "Stripe test mode, secure webhooks, and explicit approval before live mode",
        billable: true
      }
    ],
    recommendedStack: [
      "Next.js",
      "TypeScript",
      "Supabase Postgres",
      "Supabase Auth",
      "Isolated build runner"
    ],
    integrationOrder: [
      "Visual interface",
      "Database schema",
      "Authentication and permissions",
      "Core workflows",
      "Non-financial integrations",
      "Automated testing and repair",
      "Stripe and other money connections last"
    ]
  };
}
