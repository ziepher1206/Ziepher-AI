import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BuildArtifact } from "@/lib/ai/build-types";
import {
  loadBuildSiteAssets,
  MAX_BUILD_SITE_ASSET_BYTES
} from "@/lib/ai/build-site-assets";
import { createAdminClient } from "@/lib/supabase/admin";

export async function prepareWorkdir(root: string, buildJobId: string) {
  const workdir = path.resolve(root, buildJobId);
  const rootResolved = path.resolve(root);
  if (!workdir.startsWith(`${rootResolved}${path.sep}`)) {
    throw new Error("Unsafe build working directory.");
  }

  await rm(workdir, { recursive: true, force: true });
  await mkdir(workdir, { recursive: true });
  return workdir;
}

async function writeApprovedProjectMedia(workdir: string, projectId?: string) {
  if (!projectId) return [];

  const supabase = createAdminClient();
  const assets = await loadBuildSiteAssets(projectId);
  const publicRoot = path.resolve(workdir, "public");
  let totalBytes = 0;
  const written: string[] = [];

  for (const asset of assets) {
    const relativePublicPath = asset.publicPath.replace(/^\/+/, "");
    const destination = path.resolve(publicRoot, relativePublicPath);
    if (!destination.startsWith(`${publicRoot}${path.sep}`)) {
      throw new Error(`Unsafe project media path: ${asset.publicPath}`);
    }

    const { data, error } = await supabase.storage
      .from(asset.storageBucket)
      .download(asset.storagePath);
    if (error || !data) {
      throw error ?? new Error(`Unable to package project media: ${asset.name}`);
    }

    const bytes = Buffer.from(await data.arrayBuffer());
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_BUILD_SITE_ASSET_BYTES) {
      throw new Error("Approved project media exceeds the 100 MB build packaging limit.");
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    written.push(asset.publicPath);
  }

  return written;
}

export async function writeArtifact(workdir: string, artifact: BuildArtifact) {
  for (const file of artifact.files) {
    const destination = path.resolve(workdir, file.path);
    if (!destination.startsWith(`${workdir}${path.sep}`)) {
      throw new Error(`Unsafe generated path: ${file.path}`);
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.content, "utf8");
  }

  await writeApprovedProjectMedia(workdir, artifact.projectId);

  const previewPath = path.join(workdir, "ziepher-preview.html");
  await writeFile(previewPath, artifact.previewHtml, "utf8");
  return previewPath;
}

export function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}
