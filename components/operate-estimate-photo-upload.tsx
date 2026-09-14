"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

type Photo = {
  id: string;
  url: string;
  category: string;
  caption: string | null;
  displayName: string;
};

function safeFilename(name: string) {
  const clean = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(-120);
  return clean || "estimate-photo";
}

export function OperateEstimatePhotoUpload({
  workspaceId,
  estimateId,
  propertyId,
  photos
}: {
  workspaceId: string;
  estimateId: string;
  propertyId: string | null;
  photos: Photo[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("site");
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
      storagePath = `${workspaceId}/estimates/${estimateId}/${user.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("operate-media").upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw uploadError;

      const { error: mediaError } = await supabase.from("operate_estimate_media").insert({
        workspace_id: workspaceId,
        estimate_id: estimateId,
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
      setMessage("Estimate photo uploaded.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Photo upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card" style={{ maxWidth: "none" }}>
      <p className="panel-label">Estimate photos</p>
      <h2 style={{ margin: "6px 0 8px" }}>Show the site and scope clearly</h2>
      <p className="auth-copy" style={{ marginTop: 0 }}>Attach site, scope, and hazard photos to the estimate. They remain private until this estimate is shared with the customer.</p>

      {photos.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 16 }}>
          {photos.map((photo) => (
            <figure key={photo.id} className="project-card" style={{ minHeight: 0, margin: 0, padding: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || photo.displayName} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10 }} />
              <figcaption className="auth-copy" style={{ marginTop: 8, fontSize: 13 }}>{photo.caption || photo.category}</figcaption>
            </figure>
          ))}
        </div>
      ) : <p className="auth-copy">No estimate photos yet.</p>}

      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <label className="field"><span>Photo type</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="site">Site</option><option value="scope">Scope</option><option value="hazard">Hazard</option><option value="general">General</option></select></label>
          <label className="field"><span>Photo</span><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required /></label>
        </div>
        <label className="field"><span>Caption (optional)</span><input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={500} placeholder="Dead oak over garage, rear gate access, stump location…" /></label>
        <div className="inline-actions"><button className="button primary" disabled={busy} type="submit">{busy ? "Uploading…" : "Upload estimate photo"}</button>{message ? <span className="auth-copy">{message}</span> : null}</div>
      </form>
    </section>
  );
}
