export type DatabaseReadinessRelation = {
  name: string;
  area: "tree-service" | "community-value" | "platform";
};

export const LAUNCH_CRITICAL_RELATIONS: DatabaseReadinessRelation[] = [
  { name: "workspaces", area: "platform" },
  { name: "workspace_members", area: "platform" },
  { name: "projects", area: "platform" },
  { name: "customers", area: "tree-service" },
  { name: "properties", area: "tree-service" },
  { name: "leads", area: "tree-service" },
  { name: "estimates", area: "tree-service" },
  { name: "appointments", area: "tree-service" },
  { name: "crews", area: "tree-service" },
  { name: "jobs", area: "tree-service" },
  { name: "invoices", area: "tree-service" },
  { name: "payment_transactions", area: "tree-service" },
  { name: "operate_review_requests", area: "tree-service" },
  { name: "operate_automation_policies", area: "tree-service" },
  { name: "operate_automation_events", area: "tree-service" },
  { name: "community_contributors", area: "community-value" },
  { name: "value_assets", area: "community-value" },
  { name: "value_asset_contribution_events", area: "community-value" },
  { name: "value_lineage_edges", area: "community-value" },
  { name: "value_measurements", area: "community-value" },
  { name: "value_policy_versions", area: "community-value" },
  { name: "value_reward_simulations", area: "community-value" },
  { name: "value_reward_simulation_allocations", area: "community-value" },
  { name: "value_verified_effective_shares", area: "community-value" }
];
