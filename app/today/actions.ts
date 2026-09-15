"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const dailyItemSchema = z.object({
  title: z.string().trim().min(1).max(240),
  detail: z.string().trim().max(1200).optional(),
  itemKind: z.enum([
    "task",
    "appointment",
    "reminder",
    "payment_due",
    "subscription_due",
    "school",
    "shopping",
    "errand",
    "health",
    "business",
    "vehicle",
    "document",
    "family",
    "other"
  ]),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueAt: z.string().trim().optional()
});

const dailyItemIdSchema = z.object({
  dailyItemId: z.string().uuid()
});

async function getTodayWorkspace() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  return { supabase, user, workspaceId };
}

export async function addDailyItemAction(formData: FormData) {
  const input = dailyItemSchema.parse({
    title: formData.get("title"),
    detail: formData.get("detail") || undefined,
    itemKind: formData.get("itemKind"),
    priority: formData.get("priority") || "normal",
    dueAt: formData.get("dueAt") || undefined
  });

  const { supabase, user, workspaceId } = await getTodayWorkspace();
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("Invalid date or time.");

  const { error } = await supabase.from("zlife_daily_items").insert({
    workspace_id: workspaceId,
    source_module: "zlife_core",
    source_entity_type: "manual",
    source_entity_id: null,
    item_kind: input.itemKind,
    title: input.title,
    detail: input.detail || null,
    priority: input.priority,
    due_at: dueAt?.toISOString() ?? null,
    action_href: "/today",
    created_by: user.id,
    metadata: { entry_method: "manual_quick_add" }
  });

  if (error) throw error;
  revalidatePath("/today");
  revalidatePath("/dashboard");
}

export async function completeDailyItemAction(formData: FormData) {
  const { dailyItemId } = dailyItemIdSchema.parse({ dailyItemId: formData.get("dailyItemId") });
  const { supabase, workspaceId } = await getTodayWorkspace();

  const { data: item, error: itemError } = await supabase
    .from("zlife_daily_items")
    .select("id,source_module")
    .eq("id", dailyItemId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (itemError) throw itemError;
  if (!item) throw new Error("Daily item not found.");
  if (item.source_module !== "zlife_core") {
    throw new Error("Open the source module to complete this connected item.");
  }

  const { error } = await supabase
    .from("zlife_daily_items")
    .update({ status: "done" })
    .eq("id", dailyItemId)
    .eq("workspace_id", workspaceId)
    .eq("source_module", "zlife_core");

  if (error) throw error;
  revalidatePath("/today");
  revalidatePath("/dashboard");
}
