import Link from "next/link";
import { redirect } from "next/navigation";

import {
  addHomeMaintenanceAction,
  addHomeTaskAction,
  completeHomeTaskAction,
} from "@/app/home/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function HomeFamilyPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "ensure_personal_workspace",
  );
  if (workspaceError || !workspaceId) {
    throw workspaceError ?? new Error("Workspace unavailable.");
  }

  const [tasksResult, maintenanceResult] = await Promise.all([
    supabase
      .from("home_tasks")
      .select("id,title,category,status,priority,due_at,created_at")
      .eq("workspace_id", workspaceId)
      .neq("status", "cancelled")
      .order("status", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("home_maintenance_items")
      .select("id,name,location,cadence_days,last_completed_at,next_due_at")
      .eq("workspace_id", workspaceId)
      .order("next_due_at", { ascending: true, nullsFirst: false }),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (maintenanceResult.error) throw maintenanceResult.error;

  const tasks = tasksResult.data ?? [];
  const maintenance = maintenanceResult.data ?? [];
  const openTasks = tasks.filter((task) => task.status !== "done");
  const completedTasks = tasks.filter((task) => task.status === "done");

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">Z-LIFE</div>
            <div className="brand-subtitle">HOME & FAMILY</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/modules/home">About module</Link>
          <Link className="button" href="/">Z-Life home</Link>
        </div>
      </header>

      <section style={{ display: "grid", gap: 22, maxWidth: 1180 }}>
        <div>
          <p className="panel-label">Shared household workspace</p>
          <h1 style={{ margin: "6px 0 8px" }}>Home and family, in one place.</h1>
          <p className="auth-copy" style={{ maxWidth: 820, margin: 0 }}>
            Start with the everyday things that are easiest to lose track of: tasks,
            reminders, household projects, and recurring maintenance. Everything stays
            inside your existing Z-Life workspace boundary.
          </p>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          <div className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">Open tasks</p>
            <h2 style={{ fontSize: 34, margin: "8px 0" }}>{openTasks.length}</h2>
            <p>Household, family, project, and reminder items still active.</p>
          </div>
          <div className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">Maintenance tracked</p>
            <h2 style={{ fontSize: 34, margin: "8px 0" }}>{maintenance.length}</h2>
            <p>Recurring home items saved with their next planned service date.</p>
          </div>
          <div className="project-card" style={{ minHeight: 0 }}>
            <p className="panel-label">Completed</p>
            <h2 style={{ fontSize: 34, margin: "8px 0" }}>{completedTasks.length}</h2>
            <p>Finished household tasks retained for context.</p>
          </div>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Add a task</p>
          <h2 style={{ margin: "6px 0 12px" }}>Capture the next thing before it gets forgotten.</h2>
          <form action={addHomeTaskAction} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
            <input className="input" name="title" placeholder="Replace furnace filter" maxLength={180} required />
            <select className="input" name="category" defaultValue="household">
              <option value="household">Household</option>
              <option value="family">Family</option>
              <option value="maintenance">Maintenance</option>
              <option value="project">Project</option>
              <option value="reminder">Reminder</option>
            </select>
            <select className="input" name="priority" defaultValue="normal">
              <option value="low">Low priority</option>
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <input className="input" name="dueAt" type="datetime-local" aria-label="Task due date" />
            <button className="button primary" type="submit">Add task</button>
          </form>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Current tasks</p>
          <h2 style={{ margin: "6px 0 12px" }}>What the household is tracking</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {tasks.length === 0 ? (
              <p className="auth-copy">No home tasks yet. Add the first one above.</p>
            ) : (
              tasks.map((task) => (
                <div className="project-card" key={task.id} style={{ minHeight: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                    <div>
                      <strong>{task.title}</strong>
                      <p className="auth-copy" style={{ margin: "5px 0 0" }}>
                        {task.category} · {task.priority} · {formatDate(task.due_at)}
                      </p>
                    </div>
                    {task.status === "done" ? (
                      <span className="status-pill">Done</span>
                    ) : (
                      <form action={completeHomeTaskAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button className="button" type="submit">Mark done</button>
                      </form>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Maintenance</p>
          <h2 style={{ margin: "6px 0 12px" }}>Build a memory for the house.</h2>
          <form action={addHomeMaintenanceAction} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
            <input className="input" name="name" placeholder="HVAC filter" maxLength={180} required />
            <input className="input" name="location" placeholder="Basement utility room" maxLength={180} />
            <input className="input" name="cadenceDays" type="number" min={1} max={3650} placeholder="Every 90 days" />
            <input className="input" name="nextDueAt" type="datetime-local" aria-label="Next maintenance date" />
            <button className="button primary" type="submit">Add maintenance item</button>
          </form>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {maintenance.length === 0 ? (
              <p className="auth-copy">No recurring maintenance tracked yet.</p>
            ) : (
              maintenance.map((item) => (
                <div className="project-card" key={item.id} style={{ minHeight: 0 }}>
                  <strong>{item.name}</strong>
                  <p className="auth-copy" style={{ margin: "5px 0 0" }}>
                    {item.location || "No location"} · next {formatDate(item.next_due_at)}
                    {item.cadence_days ? ` · every ${item.cadence_days} days` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="project-card">
          <p className="panel-label">Foundation scope</p>
          <h2>This is the first working Home & Family slice.</h2>
          <p>
            Family schedules, shared records, richer reminders, household documents,
            permissions, and cross-module connections come next. This foundation does not
            send messages, purchase anything, or expose household data outside the signed-in workspace.
          </p>
        </section>
      </section>
    </main>
  );
}
