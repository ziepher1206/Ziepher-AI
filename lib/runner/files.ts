import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BuildArtifact } from "@/lib/ai/build-types";

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

export async function writeArtifact(workdir: string, artifact: BuildArtifact) {
  for (const file of artifact.files) {
    const destination = path.resolve(workdir, file.path);
    if (!destination.startsWith(`${workdir}${path.sep}`)) {
      throw new Error(`Unsafe generated path: ${file.path}`);
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.content, "utf8");
  }

  const previewPath = path.join(workdir, "ziepher-preview.html");
  await writeFile(previewPath, artifact.previewHtml, "utf8");
  return previewPath;
}

export function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}
