# Ziepher Project Sync

Ziepher keeps authenticated project studio state synchronized through Supabase while the active product remains browser-first.

## State model

Each cloud project has one current snapshot in `project_sync_states` and an append-only history in `project_sync_events`.

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
    "workspaceName": "",
    "lastCheckpointAt": null,
    "lastCheckpointSha256": ""
  }
}
```

Updates use an expected `baseRevision` and a unique client `eventId`. The database locks the snapshot, rejects stale revisions, records the accepted event, and returns the new snapshot. Reusing an accepted event ID is idempotent.

## Browser client behavior

`use-project-sync` performs four jobs:

1. loads the newest snapshot and missing events;
2. subscribes to Supabase Realtime changes for the project snapshot;
3. polls as a reconnect fallback;
4. stores unsent patches in a browser-local queue and replays them when online.

On a revision conflict, the client reloads current state, merges pending top-level state sections, and retries the same idempotent event once.

## Built-in AI context

The context editor stores product vision, target users, permanent requirements, decisions, constraints, integrations, and notes in shared state. Planning and cloud build/repair prompts load this project-scoped context before invoking the configured AI route or deterministic fallback.

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/projects/:id/sync` | GET | Load the current snapshot and events after a revision |
| `/api/projects/:id/sync` | PATCH | Apply an optimistic, idempotent state patch |
| `/api/projects/:id/context` | GET | Read the AI context and current revision |
| `/api/projects/:id/context` | PUT | Replace AI context through the revisioned sync contract |

## Legacy desktop bridge compatibility

Earlier repository checkpoints included a Tauri desktop client and local-folder bridge. Native client packaging is no longer part of the active product or release pipeline.

The existing bridge database/API compatibility surface is intentionally not being dropped during the browser-first rebuild because destructive schema removal is unnecessary and could break older data. It should be treated as dormant compatibility code, not as a supported delivery path.

If a native/local-folder workflow becomes valuable later, it should return as a separately justified module with fresh threat modeling, explicit file selection, reviewable diffs, compare-before-write protection, and independent release gates. Git history preserves the previous implementation for reference.
