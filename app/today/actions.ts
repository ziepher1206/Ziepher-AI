"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const repeatOptions = ["once", "daily", "weekly", "monthly", "yearly"] as const;
type RepeatOption = (typeof repeatOptions)[number];

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
  ]).default("task"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueAt: z.string().trim().optional(),
  repeat: z.enum(repeatOptions).default("once")
});

const dailyItemIdSchema = z.object({
  dailyItemId: z.string().uuid()
});

const postponeSchema = z.object({
  dailyItemId: z.string().uuid(),
  postpone: z.enum(["later_today", "tomorrow", "next_week"])
});

async function getTodayWorkspace() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  return { supabase, user, workspaceId };
}

function advanceOccurrence(value: Date, repeat: Exclude<RepeatOption, "once">) {
  const next = new Date(value);
  if (repeat === "daily") next.setDate(next.getDate() + 1);
  if (repeat === "weekly") next.setDate(next.getDate() + 7);
  if (repeat === "monthly") next.setMonth(next.getMonth() + 1);
  if (repeat === "yearly") next.setFullYear(next.getFullYear() + 1);
  return next;
}

function nextFutureOccurrence(value: Date, repeat: Exclude<RepeatOption, "once">) {
  const now = new Date();
  let next = advanceOccurrence(value, repeat);
  let safety = 0;
  while (next <= now && safety < 500) {
    next = advanceOccurrence(next, repeat);
    safety += 1;
  }
  return next;
}

function readRepeat(metadata: unknown): RepeatOption {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "once";
  const repeat = (metadata as Record<string, unknown>).repeat;
  return repeatOptions.includes(repeat as RepeatOption) ? repeat as RepeatOption : "once";
}

function postponedDueAt(option: "later_today" | "tomorrow" | "next_week") {
  const now = new Date();
  if (option === "later_today") return new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const next = new Date(now);
  if (option === "tomorrow") next.setDate(next.getDate() + 1);
  if (option === "next_week") next.setDate(next.getDate() + 7);
  return next;
}

export async function addDailyItemAction(formData: FormData) {
  const input = dailyItemSchema.parse({
    title: formData.get("title"),
    detail: formData.get("detail") || undefined,
    itemKind: formData.get("itemKind") || "task",
    priority: formData.get("priority") || "normal",
    dueAt: formData.get("dueAt") || undefined,
    repeat: formData.get("repeat") || "once"
  });

  const { supabase, user, workspaceId } = await getTodayWorkspace();
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("Invalid date or time.");
  if (input.repeat !== "once" && !dueAt) throw new Error("Choose a date and time for recurring My Day items.");

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
    metadata: {
      entry_method: "manual_quick_add",
      repeat: input.repeat,
      completed_count: 0
    }
  });

  if (error) throw error;
  revalidatePath("/today");
  revalidatePath("/dashboard");
}

export async function postponeDailyItemAction(formData: FormData) {
  const { dailyItemId, postpone } = postponeSchema.parse({
    dailyItemId: formData.get("dailyItemId"),
    postpone: formData.get("postpone")
  });
  const { supabase, workspaceId } = await getTodayWorkspace();

  const { data: item, error: itemError } = await supabase
    .from("zlife_daily_items")
    .select("id,source_module,metadata")
    .eq("id", dailyItemId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (itemError) throw itemError;
  if (!item) throw new Error("Daily item not found.");
  if (item.source_module !== "zlife_core") {
    throw new Error("Open the source module to reschedule this connected item.");
  }

  const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, unknown>
    : {};

  const { error } = await supabase
    .from("zlife_daily_items")
    .update({
      due_at: postponedDueAt(postpone).toISOString(),
      metadata: {
        ...metadata,
        last_postponed_at: new Date().toISOString(),
        last_postpone_choice: postpone
      }
    })
    .eq("id", dailyItemId)
    .eq("workspace_id", workspaceId)
    .eq("source_module", "zlife_core");

  if (error) throw error;
  revalidatePath("/today");
  revalidatePath("/dashboard");
}

export async function completeDailyItemAction(formData: FormData) {
  const { dailyItemId } = dailyItemIdSchema.parse({ dailyItemId: formData.get("dailyItemId") });
  const { supabase, workspaceId } = await getTodayWorkspace();

  const { data: item, error: itemError } = await supabase
    .from("zlife_daily_items")
    .select("id,source_module,due_at,metadata")
    .eq("id", dailyItemId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (itemError) throw itemError;
  if (!item) throw new Error("Daily item not found.");
  if (item.source_module !== "zlife_core") {
    throw new Error("Open the source module to complete this connected item.");
  }

  const repeat = readRepeat(item.metadata);
  const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, unknown>
    : {};

  if (repeat !== "once" && item.due_at) {
    const currentDue = new Date(item.due_at);
    if (Number.isNaN(currentDue.getTime())) throw new Error("Recurring item has an invalid due date.");
    const nextDue = nextFutureOccurrence(currentDue, repeat);
    const completedCount = typeof metadata.completed_count === "number" ? metadata.completed_count : 0;

    const { error } = await supabase
      .from("zlife_daily_items")
      .update({
        due_at: nextDue.toISOString(),
        metadata: {
          ...metadata,
          repeat,
          completed_count: completedCount + 1,
          last_completed_at: new Date().toISOString()
        }
      })
      .eq("id", dailyItemId)
      .eq("workspace_id", workspaceId)
      .eq("source_module", "zlife_core");

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("zlife_daily_items")
      .update({ status: "done" })
      .eq("id", dailyItemId)
      .eq("workspace_id", workspaceId)
      .eq("source_module", "zlife_core");

    if (error) throw error;
  }

  revalidatePath("/today");
  revalidatePath("/dashboard");
}
