import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life My Day source synchronization", () => {
  const migration = source("supabase/migrations/20260915173500_zlife_daily_item_sources.sql");

  it("keeps source modules authoritative while maintaining a compact daily feed", () => {
    expect(migration).toContain("Source tables remain authoritative");
    expect(migration).toContain("sync_home_task_to_zlife_daily_item");
    expect(migration).toContain("sync_appointment_to_zlife_daily_item");
    expect(migration).toContain("sync_invoice_to_zlife_daily_item");
    expect(migration).toContain("sync_lead_to_zlife_daily_item");
    expect(migration).toContain("sync_home_maintenance_to_zlife_daily_item");
  });

  it("routes daily items back to their owning workflow", () => {
    for (const href of ["/home", "/operate/calendar", "/operate/invoices", "/operate/leads"]) {
      expect(migration).toContain(`'${href}'`);
    }
  });

  it("removes resolved source records from the open daily feed", () => {
    expect(migration).toContain("new.status in ('done', 'cancelled')");
    expect(migration).toContain("new.status = 'canceled'");
    expect(migration).toContain("new.status <> 'new'");
    expect(migration).toContain("new.status not in ('sent', 'partial', 'overdue')");
  });

  it("backfills currently relevant records on controlled migration", () => {
    expect(migration).toContain("from public.home_tasks");
    expect(migration).toContain("from public.appointments");
    expect(migration).toContain("from public.leads");
    expect(migration).toContain("from public.invoices");
    expect(migration).toContain("from public.home_maintenance_items");
  });
});
