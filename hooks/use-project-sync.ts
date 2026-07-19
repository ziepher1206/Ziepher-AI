"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectSyncState } from "@/lib/domain/schemas";
import {
  createSyncEventId,
  getOrCreateDeviceId,
  mergeProjectSyncState,
  parseProjectSyncState
} from "@/lib/sync/project-state";

type SyncStatus = "disabled" | "connecting" | "live" | "saving" | "offline" | "error";

type SyncSnapshot = {
  project_id: string;
  revision: number;
  state: ProjectSyncState;
  last_event_id?: string | null;
  updated_from_device?: string | null;
  updated_at: string;
};

type PendingPatch = {
  eventId: string;
  eventType: "state.patch" | "context.patch" | "bridge.checkpoint";
  patch: Partial<ProjectSyncState>;
};

type UseProjectSyncOptions = {
  projectId?: string;
  enabled: boolean;
  onRemoteState: (state: ProjectSyncState, snapshot: SyncSnapshot) => void;
};

function queueKey(projectId: string) {
  return `ziepher-sync-queue:${projectId}`;
}

function readQueue(projectId: string): PendingPatch[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(queueKey(projectId)) ?? "[]");
    return Array.isArray(value) ? value.slice(-100) : [];
  } catch {
    window.localStorage.removeItem(queueKey(projectId));
    return [];
  }
}

function writeQueue(projectId: string, queue: PendingPatch[]) {
  if (queue.length) {
    window.localStorage.setItem(queueKey(projectId), JSON.stringify(queue.slice(-100)));
  } else {
    window.localStorage.removeItem(queueKey(projectId));
  }
}

export function useProjectSync({
  projectId,
  enabled,
  onRemoteState
}: UseProjectSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>(enabled ? "connecting" : "disabled");
  const [revision, setRevision] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const revisionRef = useRef(0);
  const stateRef = useRef<ProjectSyncState | null>(null);
  const deviceIdRef = useRef<string>("");
  const processingRef = useRef(false);
  const onRemoteStateRef = useRef(onRemoteState);
  onRemoteStateRef.current = onRemoteState;

  const applySnapshot = useCallback((snapshot: SyncSnapshot) => {
    const parsed = parseProjectSyncState(snapshot.state);
    const normalized = { ...snapshot, state: parsed };
    revisionRef.current = Number(snapshot.revision);
    stateRef.current = parsed;
    setRevision(Number(snapshot.revision));
    setLastSyncedAt(snapshot.updated_at);
    onRemoteStateRef.current(parsed, normalized);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !projectId) return null;
    const response = await fetch(
      `/api/projects/${projectId}/sync?afterRevision=${revisionRef.current}`,
      { cache: "no-store" }
    );
    const payload = (await response.json()) as {
      snapshot?: SyncSnapshot;
      error?: string;
    };
    if (!response.ok || !payload.snapshot) {
      throw new Error(payload.error ?? "Unable to refresh shared project state.");
    }
    applySnapshot(payload.snapshot);
    return payload.snapshot;
  }, [applySnapshot, enabled, projectId]);

  const sendPatch = useCallback(
    async (pending: PendingPatch, allowConflictRetry = true): Promise<void> => {
      if (!projectId) return;
      const response = await fetch(`/api/projects/${projectId}/sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseRevision: revisionRef.current,
          eventId: pending.eventId,
          deviceId: deviceIdRef.current,
          eventType: pending.eventType,
          patch: pending.patch
        })
      });
      const payload = (await response.json()) as {
        snapshot?: SyncSnapshot;
        error?: string;
      };

      if (response.status === 409 && allowConflictRetry) {
        const latest = await refresh();
        if (latest) {
          pending.patch = mergeProjectSyncState(latest.state, pending.patch);
        }
        await sendPatch(pending, false);
        return;
      }

      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error ?? "Unable to save shared project state.");
      }
      applySnapshot(payload.snapshot);
    },
    [applySnapshot, projectId, refresh]
  );

  const flushQueue = useCallback(async () => {
    if (!enabled || !projectId || processingRef.current || !navigator.onLine) return;
    processingRef.current = true;
    try {
      for (;;) {
        const queue = readQueue(projectId);
        if (!queue.length) break;
        setStatus("saving");
        await sendPatch(queue[0]);
        writeQueue(
          projectId,
          readQueue(projectId).filter((item) => item.eventId !== queue[0].eventId)
        );
      }
      setStatus("live");
    } catch {
      setStatus(navigator.onLine ? "error" : "offline");
    } finally {
      processingRef.current = false;
    }
  }, [enabled, projectId, sendPatch]);

  const pushPatch = useCallback(
    async (
      patch: Partial<ProjectSyncState>,
      eventType: PendingPatch["eventType"] = "state.patch"
    ) => {
      if (!enabled || !projectId) return;
      const pending: PendingPatch = {
        eventId: createSyncEventId(),
        eventType,
        patch
      };
      const queue = readQueue(projectId);
      queue.push(pending);
      writeQueue(projectId, queue);
      await flushQueue();
    },
    [enabled, flushQueue, projectId]
  );

  useEffect(() => {
    if (!enabled || !projectId) {
      return;
    }

    deviceIdRef.current = getOrCreateDeviceId();
    let active = true;
    const startStatusTimer = window.setTimeout(() => {
      if (active) setStatus(navigator.onLine ? "connecting" : "offline");
    }, 0);

    void refresh()
      .then(() => {
        if (active) {
          setStatus("live");
          void flushQueue();
        }
      })
      .catch(() => {
        if (active) setStatus(navigator.onLine ? "error" : "offline");
      });

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`project-sync:${projectId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "project_sync_states",
            filter: `project_id=eq.${projectId}`
          },
          (payload) => {
            const next = payload.new as SyncSnapshot;
            if (Number(next.revision) > revisionRef.current) applySnapshot(next);
            if (active) setStatus("live");
          }
        )
        .subscribe((nextStatus) => {
          if (!active) return;
          if (nextStatus === "SUBSCRIBED") setStatus("live");
          if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
            setStatus("error");
          }
        });
    } catch {
      // Polling below remains the reconnect fallback when Realtime is unavailable.
    }

    const poll = window.setInterval(() => {
      if (!active || !navigator.onLine) return;
      void refresh().catch(() => setStatus("error"));
      void flushQueue();
    }, 15_000);

    const online = () => {
      setStatus("connecting");
      void refresh().then(flushQueue).catch(() => setStatus("error"));
    };
    const offline = () => setStatus("offline");
    const visible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void refresh();
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);

    return () => {
      active = false;
      window.clearTimeout(startStatusTimer);
      window.clearInterval(poll);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
      if (channel) void channel.unsubscribe();
    };
  }, [applySnapshot, enabled, flushQueue, projectId, refresh]);

  return {
    status: enabled && projectId ? status : "disabled",
    revision,
    lastSyncedAt,
    deviceId: deviceIdRef.current,
    pushPatch,
    refresh
  };
}
