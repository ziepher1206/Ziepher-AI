import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const completion = read("supabase/migrations/20260914010100_fix_job_completion_time_invariant.sql");

describe("Tree Service job completion to invoice lineage", () => {
  it("returns the existing invoice when a completed job is retried", () => {
    expect(completion).toContain("where i.workspace_id = v_job.workspace_id and i.job_id = v_job.id");
    expect(completion).toContain("if v_job.status = 'completed' then");
    expect(completion).toContain("if v_invoice_id is null then raise exception 'Completed job is missing its invoice.'");
    expect(completion).toContain("return v_invoice_id;");
  });

  it("requires completion evidence before closing the job", () => {
    expect(completion).toContain("completion_work_verified");
    expect(completion).toContain("completion_cleanup_verified");
    expect(completion).toContain("m.category = 'after'");
    expect(completion).toContain("Add at least one after photo before completing the job.");
  });

  it("preserves workspace, customer, property and job lineage in the invoice", () => {
    expect(completion).toContain("workspace_id, customer_id, property_id, job_id, invoice_number, status");
    expect(completion).toContain("v_job.workspace_id, v_job.customer_id, v_job.property_id, v_job.id, v_invoice_number, 'draft'");
  });

  it("carries approved estimate lines and change orders into invoice line items when totals match", () => {
    expect(completion).toContain("v_use_estimate_breakdown := v_has_estimate_items and v_final = v_estimate.total_cents + v_change_total");
    expect(completion).toContain("jsonb_build_object('source','estimate','estimateLineItemId',eli.id)");
    expect(completion).toContain("jsonb_build_object('source','change_order','changeOrderId',co.id)");
    expect(completion).toContain("co.status = 'approved'");
  });

  it("falls back to a single completed-service line when no safe estimate breakdown applies", () => {
    expect(completion).toContain("'Completed service — ' || v_job.title");
    expect(completion).toContain("jsonb_build_object('source','job')");
  });
});
