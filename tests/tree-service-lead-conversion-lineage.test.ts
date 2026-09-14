import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const conversion = read("supabase/migrations/20260913155000_ziepher_operate_lead_to_estimate.sql");

describe("Tree Service lead conversion lineage", () => {
  it("requires an authenticated workspace member", () => {
    expect(conversion).toContain("if auth.uid() is null then");
    expect(conversion).toContain("if not public.is_workspace_member(v_lead.workspace_id) then");
    expect(conversion).toContain("revoke all on function public.convert_operate_lead_to_estimate");
    expect(conversion).toContain("from anon");
  });

  it("reuses matching active customers instead of creating obvious duplicates", () => {
    expect(conversion).toContain("v_customer_id := v_lead.customer_id");
    expect(conversion).toContain("c.workspace_id = v_lead.workspace_id");
    expect(conversion).toContain("c.deleted_at is null");
    expect(conversion).toContain("lower(c.email) = lower(v_lead.email)");
    expect(conversion).toContain("c.phone = v_lead.phone");
    expect(conversion).toContain("if v_customer_id is null then");
  });

  it("reuses a matching active property for the converted customer when possible", () => {
    expect(conversion).toContain("v_property_id := v_lead.property_id");
    expect(conversion).toContain("p.workspace_id = v_lead.workspace_id");
    expect(conversion).toContain("p.customer_id = v_customer_id");
    expect(conversion).toContain("p.deleted_at is null");
    expect(conversion).toContain("lower(trim(p.address_line_1)) = lower(trim(v_lead.service_address))");
  });

  it("preserves lead, customer, property, service and workspace lineage into the estimate", () => {
    expect(conversion).toContain("workspace_id,\n    customer_id,\n    property_id,\n    lead_id,\n    service_id");
    expect(conversion).toContain("v_lead.workspace_id,\n    v_customer_id,\n    v_property_id,\n    v_lead.id,\n    v_lead.service_id");
  });

  it("creates a linked estimate appointment with the same lineage", () => {
    expect(conversion).toContain("estimate_id,\n    assigned_user_id,\n    appointment_type");
    expect(conversion).toContain("v_estimate_id,\n    auth.uid(),\n    'estimate'");
    expect(conversion).toContain("p_starts_at + make_interval(mins => p_duration_minutes)");
  });

  it("updates the originating lead to the converted records", () => {
    expect(conversion).toContain("set customer_id = v_customer_id");
    expect(conversion).toContain("property_id = v_property_id");
    expect(conversion).toContain("status = 'estimate_scheduled'");
    expect(conversion).toContain("where id = v_lead.id");
  });
});
