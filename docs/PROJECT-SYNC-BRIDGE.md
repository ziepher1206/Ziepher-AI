# Ziepher Project Sync Bridge

Checkpoint 0.7.0 adds the first complete shared-state contract between the web
studio, Supabase, built-in AI context, and the installed Tauri desktop client.

## State model

Each cloud project has one current snapshot in `project_sync_states` and an
append-only history in `project_sync_events`.

```json
{
  "schemaVersion": 1,
  "studio": {
    "prompt": "...",
    "plan": {},
    "selectedConcept": "quiet-premium",
    "qualityMode": "balanced",
    "previewDevice": "desktop",
    "currentVersion": 0,
    "updatedAt": "2026-07-18T00:00:00.000Z"
  },
  "aiContext": {
    "vision": "...",
    "targetUsers": [],
    "requirements": [],
    "decisions": [],
    "constraints": [],
    "integrations": [],
    "notes": []
  },
  "bridge": {
    "workspaceName": "my-project",
    "lastCheckpointAt": "2026-07-18T00:00:00.000Z",
    "lastCheckpointSha256": "..."
  }
}
```

Updates use an expected `baseRevision` and a unique client `eventId`. The
database locks the snapshot, rejects stale revisions, records the accepted
event, and returns the new snapshot. Reusing an accepted event id is idempotent.

## Live client behavior

`use-project-sync` performs four jobs:

1. loads the newest snapshot and missing events;
2. subscribes to Supabase Realtime changes for the project snapshot;
3. polls every 15 seconds as a reconnect fallback;
4. stores unsent patches in a browser-local queue and replays them when online.

On a revision conflict, the client reloads the current state, merges the pending
top-level state sections, and retries the same idempotent event once.

## Built-in AI context

The context editor stores product vision, target users, permanent requirements,
decisions, constraints, integrations, and notes in shared state. Planning and
cloud build/repair prompts load this context before invoking Gemini, OpenAI, or
the deterministic fallback. Context remains project-scoped and is protected by
the same project membership rules as the rest of the workspace.

## Desktop bridge security boundary

The desktop client does not expose an arbitrary path argument. A user selects a
folder in a native system dialog, and Rust keeps the approved canonical root in
memory. Commands then accept project-relative paths only.

The bridge currently provides:

- persistent device identity and capability reporting;
- native folder authorization and disconnect;
- deterministic file inventory and checkpoint hashing;
- UTF-8 text reads up to 2 MiB;
- guarded text writes up to 2 MiB;
- SHA-256 compare-before-write conflict detection;
- automatic recovery copies in `.ziepher/backups` before overwrites;
- rejection of absolute paths, parent traversal, symlinks, and path escapes.

Remote IPC is limited to `https://app.ziepher.ai` and the local development
origin. The cloud receives the workspace name, device capabilities, last-seen
time, and checkpoint hash—not the selected absolute folder path or file content.

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/projects/:id/sync` | GET | Load the current snapshot and events after a revision |
| `/api/projects/:id/sync` | PATCH | Apply an optimistic, idempotent state patch |
| `/api/projects/:id/context` | GET | Read the AI context and current revision |
| `/api/projects/:id/context` | PUT | Replace AI context through the revisioned sync contract |
| `/api/projects/:id/bridge` | GET | List registered desktop bridge devices |
| `/api/projects/:id/bridge` | POST | Register or refresh a bridge device |

## Next bridge checkpoint

The safe foundation is ready for a repo adapter and file-diff workflow. The next
implementation should add explicit file selection, reviewable diffs, batched
compare-and-write operations, and a Git commit adapter. Those operations must
continue to require the approved workspace root and expected file hashes.
