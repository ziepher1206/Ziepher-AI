import { z } from "zod";

const markerSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().uuid(),
  buildJobId: z.string().uuid(),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  repositoryFullName: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  baseBranch: z.string().min(1).max(255)
});

export type SourceControlBuildMarker = z.infer<typeof markerSchema>;

export function createSourceControlBuildMarker(input: SourceControlBuildMarker) {
  const marker = markerSchema.parse(input);
  return `${JSON.stringify(marker, null, 2)}\n`;
}

export function sourceControlBuildMarkerMatches(
  content: string | null,
  expected: SourceControlBuildMarker
) {
  if (!content) return false;
  try {
    const parsed = markerSchema.parse(JSON.parse(content));
    return (
      parsed.schemaVersion === expected.schemaVersion &&
      parsed.projectId === expected.projectId &&
      parsed.buildJobId === expected.buildJobId &&
      parsed.sourceSha256 === expected.sourceSha256 &&
      parsed.repositoryFullName === expected.repositoryFullName &&
      parsed.baseBranch === expected.baseBranch
    );
  } catch {
    return false;
  }
}
