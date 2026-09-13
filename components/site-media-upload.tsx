"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

function safeFilename(name: string) {
  const clean = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-120);
  return clean || "business-photo";
}

export function SiteMediaUpload({
  projectId,
  workspaceId
}: {
  projectId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage("Choose a photo first.");
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setMessage("Use a JPEG, PNG, WebP, HEIC, or HEIF image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage("Photo must be 10 MB or smaller.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    let storagePath: string | null = null;

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sign in again before uploading.");

      storagePath = `${projectId}/${user.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("site-media")
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false
        });
      if (uploadError) throw uploadError;

      const { error: assetError } = await supabase.from("media_assets").insert({
        workspace_id: workspaceId,
        project_id: projectId,
        uploaded_by: user.id,
        source_type: "upload",
        storage_bucket: "site-media",
        storage_path: storagePath,
        display_name: file.name,
        mime_type: file.type,
        usage_status: "available",
        provenance: {
          original_name: file.name,
          original_size_bytes: file.size
        }
      });

      if (assetError) {
        await supabase.storage.from("site-media").remove([storagePath]);
        throw assetError;
      }

      if (inputRef.current) inputRef.current.value = "";
      setMessage("Photo uploaded to this business library.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Photo upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit} style={{ maxWidth: 620 }}>
      <div>
        <p className="panel-label">Upload business photos</p>
        <h2 style={{ marginTop: 6 }}>Website photo library</h2>
        <p className="auth-copy">
          Upload only photos the business owns or is authorized to use. Files stay private to this website workspace until SiteRefiner uses them in an approved build.
        </p>
      </div>

      <label>
        Photo
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          required
        />
      </label>

      {message ? <div className="auth-message">{message}</div> : null}

      <button className="button primary auth-submit" disabled={busy}>
        {busy ? "Uploading…" : "Upload photo"}
      </button>
    </form>
  );
}
