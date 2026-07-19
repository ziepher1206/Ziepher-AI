import { z } from "zod";

export const qualityModeSchema = z.enum(["economy", "balanced", "best"]);
export type QualityMode = z.infer<typeof qualityModeSchema>;

export const projectIdSchema = z.string().uuid();

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  idea: z.string().trim().min(10).max(12000)
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    status: z
      .enum([
        "planning",
        "ready_to_build",
        "building",
        "testing",
        "ready_to_deploy",
        "deployed",
        "archived"
      ])
      .optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one project field is required."
  });

export const buildRequestSchema = z.object({
  projectId: projectIdSchema,
  requestedMode: qualityModeSchema.default("balanced"),
  approvedSpecVersionId: z.string().uuid()
});

const contextListSchema = z
  .array(z.string().trim().min(1).max(500))
  .max(100)
  .default([]);

export const projectAIContextSchema = z.object({
  vision: z.string().trim().max(4000).default(""),
  targetUsers: contextListSchema,
  requirements: contextListSchema,
  decisions: contextListSchema,
  constraints: contextListSchema,
  integrations: contextListSchema,
  notes: contextListSchema
});
export type ProjectAIContext = z.infer<typeof projectAIContextSchema>;

export const emptyProjectAIContext: ProjectAIContext = {
  vision: "",
  targetUsers: [],
  requirements: [],
  decisions: [],
  constraints: [],
  integrations: [],
  notes: []
};

export const projectStudioStateSchema = z
  .object({
    prompt: z.string().max(12000).optional(),
    projectName: z.string().max(100).optional(),
    status: z.string().max(80).optional(),
    plan: z.unknown().optional(),
    selectedConcept: z.string().max(100).optional(),
    qualityMode: qualityModeSchema.optional(),
    previewDevice: z.enum(["desktop", "tablet", "mobile"]).optional(),
    currentVersion: z.number().int().min(0).optional(),
    updatedAt: z.string().datetime().optional()
  })
  .strict();
export type ProjectStudioState = z.infer<typeof projectStudioStateSchema>;

export const projectBridgeStateSchema = z
  .object({
    activeFile: z.string().max(1000).optional(),
    workspaceName: z.string().max(200).optional(),
    lastCheckpointAt: z.string().datetime().optional(),
    lastCheckpointSha256: z.string().regex(/^[a-f0-9]{64}$/).optional()
  })
  .strict();

export const projectSyncStateSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  studio: projectStudioStateSchema.default({}),
  aiContext: projectAIContextSchema.default(emptyProjectAIContext),
  bridge: projectBridgeStateSchema.default({})
});
export type ProjectSyncState = z.infer<typeof projectSyncStateSchema>;

export const projectSyncPatchValueSchema = z
  .object({
    schemaVersion: z.literal(1).optional(),
    studio: projectStudioStateSchema.optional(),
    aiContext: projectAIContextSchema.optional(),
    bridge: projectBridgeStateSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "A sync patch must contain at least one project state section."
  });

export const projectSyncPatchSchema = z.object({
  baseRevision: z.number().int().min(0),
  eventId: z.string().uuid(),
  deviceId: z.string().trim().min(8).max(200),
  eventType: z
    .enum(["state.patch", "context.patch", "bridge.checkpoint"])
    .default("state.patch"),
  patch: projectSyncPatchValueSchema
});

export const bridgeRegistrationSchema = z.object({
  deviceId: z.string().trim().min(8).max(200),
  deviceName: z.string().trim().min(1).max(120),
  platform: z.enum(["windows", "macos", "linux", "unknown"]),
  bridgeVersion: z.string().trim().min(1).max(40),
  workspaceHint: z.string().trim().max(500).optional(),
  capabilities: z.array(z.string().trim().min(1).max(100)).max(30).default([])
});
