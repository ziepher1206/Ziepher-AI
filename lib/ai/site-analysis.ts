import { z } from "zod";
import type { WebsiteHealth } from "@/lib/site-scan";

export const siteAnalysisSchema = z.object({
  summary: z.string().min(20).max(1200),
  strengths: z.array(z.string().min(4).max(300)).max(8),
  risks: z.array(z.string().min(4).max(300)).max(8),
  priorities: z.array(
    z.object({
      title: z.string().min(3).max(140),
      reason: z.string().min(8).max(500),
      impact: z.enum(["high", "medium", "low"]),
      category: z.enum(["seo", "accessibility", "conversion", "content", "technical", "trust"]),
      recommendedChange: z.string().min(8).max(600)
    })
  ).max(10),
  questions: z.array(z.string().min(4).max(300)).max(6)
});

export type SiteAnalysis = z.infer<typeof siteAnalysisSchema>;

export function createDeterministicSiteAnalysis(health: WebsiteHealth): SiteAnalysis {
  const passed = health.checks.filter((check) => check.passed);
  const failed = health.checks.filter((check) => !check.passed);
  const strengths = passed.slice(0, 6).map((check) => `${check.label}: ${check.detail}`);
  const categoryFor = (key: string): SiteAnalysis["priorities"][number]["category"] => {
    if (["title", "description", "canonical", "structured-data"].includes(key)) return "seo";
    if (key === "image-alt") return "accessibility";
    if (key === "conversion") return "conversion";
    if (["https", "viewport"].includes(key)) return "technical";
    return "content";
  };

  const priorities = failed.slice(0, 8).map((check, index) => ({
    title: check.label,
    reason: check.detail,
    impact: (index < 2 ? "high" : index < 5 ? "medium" : "low") as "high" | "medium" | "low",
    category: categoryFor(check.key),
    recommendedChange:
      health.recommendations[index] ?? `Improve ${check.label.toLowerCase()} and verify the result with another scan.`
  }));

  return siteAnalysisSchema.parse({
    summary: failed.length
      ? `The homepage scored ${health.score}/100 on the first-pass scan. ${passed.length} foundational checks passed and ${failed.length} need improvement. The safest next step is to address the highest-impact gaps, preview each change, and rescan before publishing.`
      : `The homepage scored ${health.score}/100 on the first-pass scan and passed all current foundational checks. The next review should focus on deeper content quality, local search relevance, conversion clarity, trust signals, accessibility, and real-user outcomes rather than changing healthy technical basics without evidence.`,
    strengths,
    risks: failed.slice(0, 6).map((check) => `${check.label}: ${check.detail}`),
    priorities,
    questions: [
      "What is the single most valuable customer action this homepage should produce?",
      "Which services and service areas should receive the strongest search emphasis?",
      "Which trust signals, reviews, certifications, guarantees, or project evidence can be verified and added?"
    ]
  });
}
