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

export async function addDailyItemAction(formData: FormData) {
  const input = dailyItemSchema.parse({
    title: formData.get("title"),
    detail: formData.get("detail") || undefined,
    itemKind: formData.get("itemKind"),
    priority: formData.get("priority") || "normal",
    dueAt: formData.get("dueAt") || undefined
  });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

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
