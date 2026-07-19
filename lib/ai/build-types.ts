import { z } from "zod";

const safePathPattern =
  /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)[A-Za-z0-9._/-]+$/;

export const generatedFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(240)
    .regex(safePathPattern, "Generated file path is unsafe."),
  content: z.string().max(500_000)
});

export const buildArtifactSchema = z.object({
  appName: z.string().min(2).max(100),
  summary: z.string().min(10).max(1200),
  files: z.array(generatedFileSchema).min(4).max(120),
  previewHtml: z.string().min(100).max(1_000_000),
  testPlan: z.array(z.string().min(2).max(300)).min(3).max(30),
  knownLimitations: z.array(z.string().max(300)).max(20).default([])
});

export type BuildArtifact = z.infer<typeof buildArtifactSchema>;
