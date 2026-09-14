import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireWorkspaceAdmin } from "@/lib/operate/workspace-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
type Context = { params: Promise<{ workspaceId: string; invoiceId: string }> };

const idSchema = z.string().uuid();
const planSchema = z.object({
  action: z.literal("create_plan"),
  depositCents: z.number().int().min(0).max(100_000_000),
  installmentCount: z.number().int().min(1).max(12),
  firstInstallmentDue: z.string().date(),
  intervalDays: z.number().int().min(1).max(90).default(30)
});
const cancelSchema = z.object({ action: z.literal("cancel_plan") });
const bodySchema = z.discriminatedUnion("action", [planSchema, cancelSchema]);

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function POST(request: Request, context: Context) {
  try {
    const { workspaceId: workspaceRaw, invoiceId: invoiceRaw } = await context.params;
    const workspaceId = idSchema.parse(workspaceRaw);
    const invoiceId = idSchema.parse(invoiceRaw);
    const input = bodySchema.parse(await request.json());
    await requireWorkspaceAdmin(workspaceId);
    const admin = createAdminClient();

    const { data: invoice, error: invoiceError } = await admin
      .from("invoices")
      .select("id,workspace_id,job_id,status,total_cents,paid_cents,issue_date")
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Invoice not found.");
    if (!invoice.job_id) throw new Error("Payment plans require an invoice linked to a job.");
    if (["paid", "void"].includes(invoice.status)) throw new Error("This invoice can no longer be placed on a payment plan.");

    const { data: existing, error: existingError } = await admin
      .from("invoice_milestones")
      .select("id,status,amount_cents")
      .eq("workspace_id", workspaceId)
      .eq("invoice_id", invoiceId)
      .neq("status", "canceled");
    if (existingError) throw existingError;

    if (input.action === "cancel_plan") {
      if ((existing ?? []).some((row) => row.status === "paid" || row.status === "refunded")) {
        throw new Error("A payment plan cannot be canceled after a milestone has been paid.");
      }
      const { error } = await admin
        .from("invoice_milestones")
        .update({ status: "canceled", provider_checkout_session_id: null, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("invoice_id", invoiceId)
        .eq("status", "unpaid");
      if (error) throw error;
      return NextResponse.json({ canceled: true });
    }

    if ((invoice.paid_cents ?? 0) > 0) throw new Error("Create the payment plan before collecting any invoice payment.");
    if ((existing ?? []).length > 0) throw new Error("This invoice already has an active payment plan.");
    if (input.depositCents >= invoice.total_cents) throw new Error("Deposit must be less than the invoice total so at least one installment remains.");

    const remaining = invoice.total_cents - input.depositCents;
    if (remaining < input.installmentCount * 50) throw new Error("Each installment must be at least $0.50.");

    const base = Math.floor(remaining / input.installmentCount);
    const remainder = remaining % input.installmentCount;
    const rows: Array<Record<string, unknown>> = [];
    let position = 0;

    if (input.depositCents > 0) {
      if (input.depositCents < 50) throw new Error("Deposit must be at least $0.50 or set to zero.");
      rows.push({
        workspace_id: workspaceId,
        invoice_id: invoice.id,
        job_id: invoice.job_id,
        position: position++,
        label: "Deposit",
        amount_cents: input.depositCents,
        status: "unpaid",
        due_date: invoice.issue_date
      });
    }

    for (let index = 0; index < input.installmentCount; index += 1) {
      rows.push({
        workspace_id: workspaceId,
        invoice_id: invoice.id,
        job_id: invoice.job_id,
        position: position++,
        label: input.installmentCount === 1 ? "Final payment" : `Installment ${index + 1} of ${input.installmentCount}`,
        amount_cents: base + (index < remainder ? 1 : 0),
        status: "unpaid",
        due_date: addDays(input.firstInstallmentDue, input.intervalDays * index)
      });
    }

    const sum = rows.reduce((total, row) => total + Number(row.amount_cents), 0);
    if (sum !== invoice.total_cents) throw new Error("Payment plan does not reconcile to the invoice total.");

    const { data, error } = await admin
      .from("invoice_milestones")
      .insert(rows)
      .select("id,position,label,amount_cents,status,due_date,paid_at,refunded_at,provider_checkout_session_id")
      .order("position");
    if (error) throw error;

    return NextResponse.json({ milestones: data, totalCents: sum }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to update invoice payment plan.");
  }
}
