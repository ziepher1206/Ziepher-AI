import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const conversion = read("supabase/migrations/20260913235500_tree_service_phase2_public_lead_intake.sql");

describe("Tree Service lead conversion lineage", () => {
  it("requires an authenticated workspace member", () => {
    expect(conversion).toContain("if auth.uid() is null then raise exception 'Authentication required.'");
    expect(conversion).toContain("if not public.is_workspace_member(v_lead.workspace_id) then raise exception 'Workspace access required.'");
  });

  it("serializes conversion by normalized customer identity to reduce duplicate races", () => {
    expect(conversion).toContain("v_email := nullif(lower(trim(coalesce(v_lead.email, ''))), '')");
    expect(conversion).toContain("v_phone_digits := nullif(regexp_replace(coalesce(v_lead.phone, ''), '[^0-9]', '', 'g'), '')");
    expect(conversion).toContain("v_identity_key := coalesce('e:' || v_email, 'p:' || v_phone_digits, 'lead:' || v_lead.id::text)");
    expect(conversion).toContain("perform pg_advisory_xact_lock(hashtextextended(v_lead.workspace_id::text || ':' || v_identity_key, 0))");
  });

  it("reuses matching active customers instead of creating obvious duplicates", () => {
    expect(conversion).toContain("v_customer_id := v_lead.customer_id");
    expect(conversion).toContain("c.workspace_id = v_lead.workspace_id");
    expect(conversion).toContain("c.deleted_at is null");
    expect(conversion).toContain("lower(trim(coalesce(c.email, ''))) = v_email");
    expect(conversion).toContain("regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = v_phone_digits");
    expect(conversion).toContain("if v_customer_id is null then");
  });

  it("reuses a normalized matching active property for the converted customer when possible", () => {
    expect(conversion).toContain("v_property_id := v_lead.property_id");
    expect(conversion).toContain("p.workspace_id = v_lead.workspace_id");
    expect(conversion).toContain("p.customer_id = v_customer_id");
    expect(conversion).toContain("p.deleted_at is null");
    expect(conversion).toContain("lower(regexp_replace(trim(p.address_line_1), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(v_lead.service_address), '\\s+', ' ', 'g'))");
  });

  it("preserves lead, customer, property, service and workspace lineage into the estimate", () => {
    expect(conversion).toContain("insert into public.estimates(workspace_id,customer_id,property_id,lead_id,service_id,estimator_user_id,title,notes,status,scheduled_at)");
    expect(conversion).toContain("values(v_lead.workspace_id,v_customer_id,v_property_id,v_lead.id,v_lead.service_id,auth.uid(),v_title");
  });

  it("creates a linked estimate appointment with the same lineage", () => {
    expect(conversion).toContain("insert into public.appointments(workspace_id,customer_id,property_id,lead_id,service_id,estimate_id,assigned_user_id,appointment_type,status,title,notes,starts_at,ends_at)");
    expect(conversion).toContain("values(v_lead.workspace_id,v_customer_id,v_property_id,v_lead.id,v_lead.service_id,v_estimate_id,auth.uid(),'estimate','confirmed'");
    expect(conversion).toContain("p_starts_at + make_interval(mins => p_duration_minutes)");
  });

  it("updates the originating lead to the converted records", () => {
    expect(conversion).toContain("update public.leads set customer_id=v_customer_id, property_id=v_property_id, status='estimate_scheduled'");
    expect(conversion).toContain("where id=v_lead.id");
  });
});
