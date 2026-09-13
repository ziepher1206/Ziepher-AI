"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function safeFilename(name: string) {
  const clean = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(-120);
  return clean || "job-photo";
}

export function OperateJobPhotoUpload({
  workspaceId,
  jobId,
  propertyId
}: {
  workspaceId: string;
  jobId: string;
  propertyId: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("before");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return setMessage("Choose a photo first.");
    if (!ALLOWED_TYPES.has(file.type)) return setMessage("Use a JPEG, PNG, WebP, HEIC, or HEIF image.");
    if (file.size > MAX_FILE_BYTES) return setMessage("Photo must be 10 MB or smaller.");

    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    let storagePath: string | null = null;
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sign in again before uploading.");
      storagePath = `${workspaceId}/${jobId}/${user.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("operate-media").upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw uploadError;

      const { error: mediaError } = await supabase.from("operate_job_media").insert({
        workspace_id: workspaceId,
        job_id: jobId,
        property_id: propertyId,
        uploaded_by: user.id,
        category,
        storage_bucket: "operate-media",
        storage_path: storagePath,
        display_name: file.name,
        mime_type: file.type,
        caption: caption.trim() || null
      });
      if (mediaError) {
        await supabase.storage.from("operate-media").remove([storagePath]);
        throw mediaError;
      }

      if (inputRef.current) inputRef.current.value = "";
      setCaption("");
      setMessage("Job photo uploaded.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Photo upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit} style={{ maxWidth: 900 }}>
      <p className="panel-label">Job photos</p>
      <h2 style={{ margin: "6px 0 8px" }}>Before / after documentation</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Photos stay private to this Ziepher workspace and job.</p>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label className="field"><span>Photo stage</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="before">Before</option><option value="after">After</option><option value="general">General</option></select></label>
        <label className="field"><span>Photo</span><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required /></label>
        <label className="field"><span>Caption (optional)</span><input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={500} placeholder="Oak over garage, rear-yard access, completed cleanup…" /></label>
        <div className="inline-actions"><button className="button primary" disabled={busy} type="submit">{busy ? "Uploading…" : "Upload photo"}</button>{message ? <span className="auth-copy">{message}</span> : null}</div>
      </div>
    </form>
  );
}
