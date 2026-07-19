export type AppTemplate = {
  id: string;
  name: string;
  goal: string;
  description: string;
  starterPrompt: string;
  icon: string;
  suggestedFeatures: string[];
};

export const appTemplates: AppTemplate[] = [
  {
    id: "business-dashboard",
    name: "Business Dashboard",
    goal: "Manage a business",
    description: "Operations, metrics, customers, tasks, and team activity.",
    starterPrompt:
      "Build a business operations dashboard with customers, tasks, reports, notifications, and role-based administration.",
    icon: "▦",
    suggestedFeatures: ["Dashboard", "Customers", "Tasks", "Reports"]
  },
  {
    id: "appointment-booking",
    name: "Appointment Booking",
    goal: "Book appointments",
    description: "Availability, services, reminders, staff, and customer portal.",
    starterPrompt:
      "Build an appointment booking platform with services, schedules, customer accounts, reminders, staff management, and an admin dashboard.",
    icon: "◷",
    suggestedFeatures: ["Calendar", "Services", "Reminders", "Staff"]
  },
  {
    id: "online-store",
    name: "Online Store",
    goal: "Sell products",
    description: "Catalog, cart, orders, inventory, and fulfillment workflows.",
    starterPrompt:
      "Build a polished online store with products, categories, search, cart, accounts, order tracking, inventory, and administration. Add payments last.",
    icon: "◇",
    suggestedFeatures: ["Catalog", "Cart", "Orders", "Inventory"]
  },
  {
    id: "ai-assistant",
    name: "AI Assistant",
    goal: "Create an AI tool",
    description: "Conversation, documents, saved workflows, and usage controls.",
    starterPrompt:
      "Build an AI productivity assistant with chat, saved conversations, file context, reusable workflows, usage history, and an admin dashboard.",
    icon: "✦",
    suggestedFeatures: ["Chat", "Files", "Workflows", "History"]
  },
  {
    id: "customer-portal",
    name: "Customer Portal",
    goal: "Serve customers",
    description: "Accounts, requests, documents, messages, and status tracking.",
    starterPrompt:
      "Build a secure customer portal with onboarding, requests, documents, messaging, status tracking, notifications, and administration.",
    icon: "◎",
    suggestedFeatures: ["Requests", "Documents", "Messages", "Status"]
  },
  {
    id: "community",
    name: "Community",
    goal: "Build a community",
    description: "Profiles, posts, groups, comments, moderation, and membership.",
    starterPrompt:
      "Build a community platform with profiles, posts, comments, groups, search, notifications, moderation, and membership controls.",
    icon: "◉",
    suggestedFeatures: ["Profiles", "Posts", "Groups", "Moderation"]
  },
  {
    id: "course-platform",
    name: "Course Platform",
    goal: "Teach a course",
    description: "Lessons, progress, quizzes, resources, and instructor tools.",
    starterPrompt:
      "Build a course platform with lessons, progress tracking, quizzes, resources, student accounts, instructor tools, and administration.",
    icon: "▤",
    suggestedFeatures: ["Lessons", "Progress", "Quizzes", "Resources"]
  },
  {
    id: "membership-content",
    name: "Membership Content",
    goal: "Publish content",
    description: "Articles, media library, access levels, and creator tools.",
    starterPrompt:
      "Build a content membership platform with articles, media, collections, search, member profiles, creator tools, and access controls. Add billing last.",
    icon: "◫",
    suggestedFeatures: ["Content", "Library", "Members", "Creator tools"]
  }
];
