"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_BATCH_FILES = 25;
const STORAGE_OVERAGE_PER_GB_MONTH = 0.0213;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/gif"
]);

function safeFilename(name: string) {
  const clean = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-120);
  return clean || "project-image";
}

function bytesToMb(bytes: number) {
  return bytes / (1024 * 1024);
}

function estimatedStorageCost(bytes: number) {
  const gigabytes = bytes / 1_000_000_000;
  return gigabytes * STORAGE_OVERAGE_PER_GB_MONTH;
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
  const [purpose, setPurpose] = useState<"site_photo" | "design_reference">("site_photo");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const totalBytes = useMemo(
    () => selectedFiles.reduce((sum, file) => sum + file.size, 0),
    [selectedFiles]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const files = Array.from(inputRef.current?.files ?? []);
    if (!files.length) {
      setMessage("Choose at least one image first.");
      return;
    }
    if (files.length > MAX_BATCH_FILES) {
      setMessage(`Upload up to ${MAX_BATCH_FILES} images at a time.`);
      return;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        setMessage(`${file.name}: use JPEG, PNG, WebP, HEIC, HEIF, AVIF, or GIF.`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setMessage(`${file.name}: each image must be 50 MB or smaller.`);
        return;
      }
    }

    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sign in again before uploading.");

      for (const file of files) {
        const storagePath = `${projectId}/${user.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("site-media")
          .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false
          });
        if (uploadError) throw uploadError;
        uploadedPaths.push(storagePath);

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
            original_size_bytes: file.size,
            purpose,
            builder_instruction:
              purpose === "design_reference"
                ? "Use this image as a visual design reference for layout, hierarchy, composition, density, and styling."
                : "Approved project photo that may be used in the generated website or application."
          }
        });

        if (assetError) throw assetError;
      }

      if (inputRef.current) inputRef.current.value = "";
      setSelectedFiles([]);
      setMessage(`${files.length} image${files.length === 1 ? "" : "s"} uploaded.`);
      router.refresh();
    } catch (cause) {
      if (uploadedPaths.length) {
        await supabase.storage.from("site-media").remove(uploadedPaths);
      }
      setMessage(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit} style={{ maxWidth: 760 }}>
      <div>
        <p className="panel-label">Project images</p>
        <h2 style={{ marginTop: 6 }}>Upload photos or design references</h2>
        <p className="auth-copy">
          Add real business photos, graphics, screenshots, or mockups you want the builder to follow. Upload only files you own or are authorized to use.
        </p>
      </div>

      <label>
        How should Z-Life use these images?
        <select value={purpose} onChange={(event) => setPurpose(event.target.value as "site_photo" | "design_reference")}>
          <option value="site_photo">Use these photos in the website or app</option>
          <option value="design_reference">Use these as design references to match</option>
        </select>
      </label>

      <label>
        Images
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/gif"
          onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
          required
        />
      </label>

      {selectedFiles.length ? (
        <div className="auth-message">
          {selectedFiles.length} selected · {bytesToMb(totalBytes).toFixed(1)} MB total · about ${estimatedStorageCost(totalBytes).toFixed(4)}/month in storage if the account is already above its included storage quota.
        </div>
      ) : null}

      <details>
        <summary style={{ cursor: "pointer" }}>How photo storage affects cost</summary>
        <div className="auth-copy" style={{ marginTop: 10 }}>
          <p>Current Supabase storage basis: Free includes 1 GB of file storage. Pro includes 100 GB. Pro storage above the included quota is currently $0.0213 per GB per month.</p>
          <p>A 10 MB photo is roughly $0.0002/month of storage after the included quota. Hundreds or thousands of large originals can add up, and bandwidth or image transformations can create separate provider charges.</p>
          <p>Z-Life should always show the provider cost before a storage upgrade or paid overage is enabled.</p>
        </div>
      </details>

      {message ? <div className="auth-message">{message}</div> : null}

      <button className="button primary auth-submit" disabled={busy}>
        {busy ? "Uploading…" : `Upload ${selectedFiles.length || "images"}`}
      </button>
    </form>
  );
}
