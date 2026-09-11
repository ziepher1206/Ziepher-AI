import "server-only";

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { generatedFileSchema } from "../ai/build-types";

const execFileAsync = promisify(execFile);
const MAX_SOURCE_BYTES = 8_000_000;
const MAX_SOURCE_FILES = 120;
const MAX_ARCHIVE_ENTRIES = 500;

export type SourceArchiveFile = {
  path: string;
  content: string;
};

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeSourceArchiveEntry(value: string) {
  let entry = value.trim();
  while (entry.startsWith("./")) entry = entry.slice(2);
  if (entry.endsWith("/")) entry = entry.slice(0, -1);
  if (!entry) return "";
  if (
    entry.startsWith("/") ||
    entry.includes("\\") ||
    entry.split("/").some((part) => part === ".." || part === "") ||
    /[\u0000-\u001f\u007f]/.test(entry)
  ) {
    throw new Error(`Unsafe source archive path: ${value}`);
  }
  return entry;
}

async function collectFiles(root: string, current = root): Promise<SourceArchiveFile[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files: SourceArchiveFile[] = [];

  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    const stats = await lstat(absolute);
    if (stats.isSymbolicLink()) {
      throw new Error("Source archive contained a symbolic link.");
    }
    if (stats.isDirectory()) {
      files.push(...(await collectFiles(root, absolute)));
      continue;
    }
    if (!stats.isFile()) {
      throw new Error("Source archive contained a non-file entry.");
    }

    const relative = path.relative(root, absolute).split(path.sep).join("/");
    const content = await readFile(absolute, "utf8");
    const parsed = generatedFileSchema.parse({ path: relative, content });
    files.push(parsed);
  }

  return files;
}

export async function readVerifiedSourceArchive(
  archiveBytes: Buffer,
  expectedSha256: string
): Promise<SourceArchiveFile[]> {
  const expected = expectedSha256.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expected)) {
    throw new Error("A valid source archive SHA-256 is required.");
  }
  if (sha256(archiveBytes) !== expected) {
    throw new Error("Source archive SHA-256 does not match the published artifact.");
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ziepher-source-"));
  const archivePath = path.join(tempRoot, "source.tar.gz");
  const extractRoot = path.join(tempRoot, "files");

  try {
    await mkdir(extractRoot, { recursive: true });
    await writeFile(archivePath, archiveBytes);

    const listed = await execFileAsync("tar", ["-tzf", archivePath], {
      maxBuffer: 2_000_000
    });
    const archiveEntries = listed.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map(normalizeSourceArchiveEntry)
      .filter(Boolean);

    if (archiveEntries.length > MAX_ARCHIVE_ENTRIES) {
      throw new Error("Source archive contains too many entries.");
    }

    await execFileAsync(
      "tar",
      [
        "--no-same-owner",
        "--no-same-permissions",
        "-xzf",
        archivePath,
        "-C",
        extractRoot
      ],
      { maxBuffer: 2_000_000 }
    );

    const files = await collectFiles(extractRoot);
    if (files.length < 1 || files.length > MAX_SOURCE_FILES) {
      throw new Error("Source archive contains an invalid number of files.");
    }

    const totalBytes = files.reduce(
      (sum, file) => sum + Buffer.byteLength(file.content, "utf8"),
      0
    );
    if (totalBytes > MAX_SOURCE_BYTES) {
      throw new Error("Source archive exceeds the 8 MB source limit.");
    }

    files.sort((a, b) => a.path.localeCompare(b.path));
    return files;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
