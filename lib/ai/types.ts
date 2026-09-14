import { z } from "zod";

export const appPlanSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(20).max(1200),
  targetUsers: z.array(z.string().min(1)).min(1).max(8),
  features: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().min(4).max(400),
        priority: z.enum(["must", "should", "could", "wont"])
      })
    )
    .min(3)
    .max(20),
  screens: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        purpose: z.string().min(4).max(300)
      })
    )
    .min(2)
    .max(20),
  visualDirections: z
    .array(
      z.object({
        id: z.string().min(1).max(50),
        name: z.string().min(1).max(80),
        description: z.string().min(4).max(300)
      })
    )
    .min(4)
    .max(8),
  buildPhases: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        outcome: z.string().min(4).max(400),
        billable: z.boolean()
      })
    )
    .min(4)
    .max(16),
  recommendedStack: z.array(z.string().min(1)).min(1).max(12),
  integrationOrder: z.array(z.string().min(1)).min(4).max(16)
});

export type AppPlan = z.infer<typeof appPlanSchema>;

export type PlanResult = {
  plan: AppPlan;
  provider: "gemini" | "openai" | "deterministic" | "mock";
  model: string;
  estimatedProviderCostUsd: number;
  developmentData?: boolean;
};
