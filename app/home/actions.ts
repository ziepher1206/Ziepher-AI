"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(180),
  category: z.enum(["household", "family", "maintenance", "project", "reminder"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueAt: z.string().trim().optional(),
});

const maintenanceSchema = z.object({
  name: z.string().trim().min(1).max(180),
  location: z.string().trim().max(180).optional(),
  cadenceDays: z.coerce.number().int().min(1).max(3650).optional(),
  nextDueAt: z.string().trim().optional(),
});

async function requireHomeWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Sign in required.");

  const { data: workspaceId, error } = await supabase.rpc("ensure_personal_workspace");
  if (error || !workspaceId) throw error ?? new Error("Workspace unavailable.");

  return { supabase, user, workspaceId };
}

function optionalDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid date.");
  return parsed.toISOString();
}

export async function addHomeTaskAction(formData: FormData) {
  const input = taskSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    dueAt: formData.get("dueAt") || undefined,
  });
  const { supabase, user, workspaceId } = await requireHomeWorkspace();

  const { error } = await supabase.from("home_tasks").insert({
    workspace_id: workspaceId,
    title: input.title,
    category: input.category,
    priority: input.priority,
    due_at: optionalDate(input.dueAt),
    created_by: user.id,
  });
  if (error) throw error;

  revalidatePath("/home");
}

export async function completeHomeTaskAction(formData: FormData) {
  const taskId = z.string().uuid().parse(formData.get("taskId"));
  const { supabase, workspaceId } = await requireHomeWorkspace();

  const { error } = await supabase
    .from("home_tasks")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  revalidatePath("/home");
}

export async function addHomeMaintenanceAction(formData: FormData) {
  const input = maintenanceSchema.parse({
    name: formData.get("name"),
    location: formData.get("location") || undefined,
    cadenceDays: formData.get("cadenceDays") || undefined,
    nextDueAt: formData.get("nextDueAt") || undefined,
  });
  const { supabase, user, workspaceId } = await requireHomeWorkspace();

  const { error } = await supabase.from("home_maintenance_items").insert({
    workspace_id: workspaceId,
    name: input.name,
    location: input.location || null,
    cadence_days: input.cadenceDays ?? null,
    next_due_at: optionalDate(input.nextDueAt),
    created_by: user.id,
  });
  if (error) throw error;

  revalidatePath("/home");
}
