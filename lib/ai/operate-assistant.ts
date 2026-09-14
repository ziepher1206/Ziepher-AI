import { z } from "zod";

export const assistantPrioritySchema = z.object({
  level: z.enum(["high", "next", "watch", "clear"]),
  title: z.string().trim().min(1).max(220),
  detail: z.string().trim().min(1).max(800),
  action: z.string().trim().min(1).max(180)
});

export const assistantExplanationInputSchema = z.object({
  businessName: z.string().trim().min(1).max(180),
  priorities: z.array(assistantPrioritySchema).min(1).max(20),
  confirmPaidAI: z.literal(true)
});

export const assistantExplanationSchema = z.object({
  summary: z.string().min(20).max(1500),
  nextSteps: z.array(
    z.object({
      title: z.string().min(3).max(180),
      reason: z.string().min(8).max(600),
      urgency: z.enum(["now", "today", "soon", "monitor"])
    })
  ).min(1).max(8),
  cautions: z.array(z.string().min(4).max(500)).max(8)
});

export type AssistantPriority = z.infer<typeof assistantPrioritySchema>;
export type AssistantExplanation = z.infer<typeof assistantExplanationSchema>;
