"use client";

import type { ProjectAIContext } from "@/lib/domain/schemas";

type Props = {
  context: ProjectAIContext;
  onChange: (context: ProjectAIContext) => void;
  onSave: () => void;
  saving: boolean;
  syncStatus: string;
  cloudEnabled: boolean;
};

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function listValue(value: string[]) {
  return value.join("\n");
}

export function ProjectContextPanel({
  context,
  onChange,
  onSave,
  saving,
  syncStatus,
  cloudEnabled
}: Props) {
  function update<Key extends keyof ProjectAIContext>(
    key: Key,
    value: ProjectAIContext[Key]
  ) {
    onChange({ ...context, [key]: value });
  }

  return (
    <details className="context-panel">
      <summary>
        <span>
          <strong>Built-in AI context</strong>
          <small>Project memory used in every plan and cloud build</small>
        </span>
        <span className={`sync-indicator sync-${syncStatus}`}>
          {cloudEnabled ? syncStatus : "saved locally"}
        </span>
      </summary>
      <div className="context-fields">
        <label>
          Product vision
          <textarea
            value={context.vision}
            onChange={(event) => update("vision", event.target.value)}
            placeholder="What this product must become and why it matters."
          />
        </label>
        <label>
          Target users — one per line
          <textarea
            value={listValue(context.targetUsers)}
            onChange={(event) => update("targetUsers", lines(event.target.value))}
            placeholder="Small service businesses\nFirst-time app owners"
          />
        </label>
        <label>
          Permanent requirements — one per line
          <textarea
            value={listValue(context.requirements)}
            onChange={(event) => update("requirements", lines(event.target.value))}
            placeholder="Simple one-click install\nWorks on phone and desktop"
          />
        </label>
        <label>
          Decisions already made — one per line
          <textarea
            value={listValue(context.decisions)}
            onChange={(event) => update("decisions", lines(event.target.value))}
            placeholder="Projects are stored in GitHub\nSupabase is the first backend"
          />
        </label>
        <label>
          Constraints and exclusions — one per line
          <textarea
            value={listValue(context.constraints)}
            onChange={(event) => update("constraints", lines(event.target.value))}
            placeholder="Money connections are built last"
          />
        </label>
        <label>
          Integrations — one per line
          <textarea
            value={listValue(context.integrations)}
            onChange={(event) => update("integrations", lines(event.target.value))}
            placeholder="GitHub\nSupabase\nOpenAI"
          />
        </label>
        <label>
          Notes — one per line
          <textarea
            value={listValue(context.notes)}
            onChange={(event) => update("notes", lines(event.target.value))}
            placeholder="Important details the AI should never lose."
          />
        </label>
        <button className="button primary" type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving context…" : "Save AI context"}
        </button>
      </div>
    </details>
  );
}
