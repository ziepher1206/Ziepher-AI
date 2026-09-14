import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260914222000_tree_service_launch_db_performance.sql",
  "utf8",
);

function sqlWithoutComments(sql: string) {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("Tree Service launch database performance hardening", () => {
  it("adds covering indexes for the core lead-to-review lifecycle", () => {
    for (const indexName of [
      "leads_project_workspace_fk_idx",
      "estimates_lead_workspace_fk_idx",
      "appointments_estimate_workspace_fk_idx",
      "jobs_estimate_workspace_fk_idx",
      "invoices_job_workspace_fk_idx",
      "payment_transactions_invoice_workspace_fk_idx",
      "operate_review_requests_job_workspace_fk_idx",
    ]) {
      expect(migration).toContain(`create index if not exists ${indexName}`);
    }
  });

  it("uses initplan-safe auth identity lookups in every advisor-flagged policy", () => {
    for (const policyName of [
      "Workspace admins can manage services",
      "Workspace admins can manage crews",
      "Workspace admins can manage crew membership",
      "Workspace admins can manage availability rules",
      "Workspace admins can manage business profile",
      "Workspace admins can manage schedule overrides",
      "Workspace admins can manage marketing spend",
      "Workspace members can create estimate share links",
      "Workspace members can add job media",
      "Workspace members can create review request drafts",
    ]) {
      expect(migration).toContain(`alter policy \"${policyName}\"`);
    }

    const executableSql = sqlWithoutComments(migration);
    expect(executableSql).toContain("(select auth.uid())");
    expect(executableSql).not.toMatch(/(?<!select )auth\.uid\(\)/);
  });

  it("keeps the accidental production migration marker represented in GitHub", () => {
    const reconciliation = readFileSync(
      "supabase/migrations/20260914221715_noop_not_applied.sql",
      "utf8",
    );
    expect(reconciliation).toContain("Migration-history reconciliation");
    expect(reconciliation).toContain("select 1;");
  });
});
