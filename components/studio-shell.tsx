"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppPlan } from "@/lib/ai/types";
import { appPlanSchema } from "@/lib/ai/types";
import { createDeterministicPlan } from "@/lib/ai/deterministic-plan";
import { appTemplates } from "@/lib/templates/catalog";
import { useVoiceInput } from "@/hooks/use-voice-input";
import {
  emptyProjectAIContext,
  type ProjectAIContext,
  type ProjectStudioState,
  type QualityMode
} from "@/lib/domain/schemas";
import { PwaInstall } from "@/components/pwa-install";
import { ProjectContextPanel } from "@/components/project-context-panel";
import { DesktopBridgeControl } from "@/components/desktop-bridge-control";
import { useProjectSync } from "@/hooks/use-project-sync";

type Message = {
  role: "ai" | "user";
  content: string;
};

type DatabaseConcept = {
  id: string;
  name: string;
  description: string;
  selected: boolean;
  tokens: Record<string, unknown> | null;
};

type BuildSummary = {
  id: string;
  status: string;
  failure_message?: string | null;
};

type DeploymentSummary = {
  id: string;
  status: string;
  environment: "preview" | "production";
  url?: string | null;
  failure_message?: string | null;
};


type LocalBuildResult = {
  buildId: string;
  version: number;
  name: string;
  slug: string;
  html: string;
  files: Array<{ path: string; content: string }>;
  checks: Array<{ name: string; status: string }>;
  generatedAt: string;
};

type StudioShellProps = {
  authenticated: boolean;
  userEmail?: string;
  initialProjectId?: string;
};

const initialPlan = createDeterministicPlan(
  "A visual AI application builder that turns voice or typed ideas into complete, tested applications."
);

const conceptStyles: Record<
  string,
  { accent: string; soft: string; surface: string; ink: string }
> = {
  "quiet-premium": {
    accent: "#6947e8",
    soft: "#e9e2ff",
    surface: "#f7f5ef",
    ink: "#171728"
  },
  "bold-future": {
    accent: "#745cff",
    soft: "#c7fff2",
    surface: "#090b15",
    ink: "#f8f8ff"
  },
  "warm-friendly": {
    accent: "#e86645",
    soft: "#ffe0a8",
    surface: "#fff7ed",
    ink: "#2d211c"
  },
  "pro-dashboard": {
    accent: "#246bfd",
    soft: "#d8e5ff",
    surface: "#eef2f8",
    ink: "#101828"
  }
};

function sourceId(concept: DatabaseConcept) {
  const value = concept.tokens?.source_id;
  return typeof value === "string" ? value : concept.id;
}

function nameFromIdea(idea: string) {
  const words = idea
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 7);
  return words.join(" ").slice(0, 100) || "New application";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildPreviewDocument(plan: AppPlan, conceptId: string) {
  const concept =
    plan.visualDirections.find((item) => item.id === conceptId) ??
    plan.visualDirections[0];

  const style =
    conceptStyles[concept?.id ?? ""] ?? conceptStyles["quiet-premium"];
  const dark = style.surface.startsWith("#0");
  const features = plan.features
    .filter((item) => item.priority !== "wont")
    .slice(0, 4)
    .map(
      (feature, index) => `
      <article>
        <span>0${index + 1}</span>
        <h3>${escapeHtml(feature.name)}</h3>
        <p>${escapeHtml(feature.description)}</p>
      </article>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(plan.title)}</title>
<style>
:root{--accent:${style.accent};--soft:${style.soft};--surface:${style.surface};--ink:${style.ink};--muted:${dark ? "#a8afc4" : "#626879"};--line:${dark ? "rgba(255,255,255,.12)" : "rgba(20,24,40,.12)"}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:radial-gradient(circle at 5% 0%,color-mix(in srgb,var(--accent) 24%,transparent),transparent 34%),radial-gradient(circle at 94% 14%,color-mix(in srgb,var(--soft) 45%,transparent),transparent 30%),var(--surface);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
button,a{font:inherit}a{color:inherit;text-decoration:none}button{border:0;cursor:pointer}.nav{width:min(1120px,calc(100% - 28px));margin:14px auto;padding:11px 13px 11px 17px;display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:17px;background:color-mix(in srgb,var(--surface) 80%,transparent);backdrop-filter:blur(16px);position:sticky;top:10px;z-index:4}.logo{font-weight:950;letter-spacing:-.04em}.nav nav{display:flex;align-items:center;gap:17px;font-size:13px}.nav button,.primary{padding:10px 14px;border-radius:11px;background:var(--ink);color:var(--surface);font-weight:850}.hero,.section{width:min(1120px,calc(100% - 30px));margin:0 auto}.hero{min-height:540px;display:grid;grid-template-columns:1.35fr .65fr;gap:34px;align-items:center;padding:55px 0}.eyebrow{margin:0 0 11px;color:var(--accent);font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}h1{max-width:850px;margin:0;font-size:clamp(44px,7vw,92px);line-height:.9;letter-spacing:-.065em}.lede{max-width:700px;margin:23px 0;color:var(--muted);font-size:clamp(16px,2vw,19px);line-height:1.62}.actions{display:flex;gap:10px;align-items:center}.primary,.secondary{padding:12px 17px;border-radius:12px;font-weight:850}.secondary{border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 80%,white 8%)}.signal{padding:22px;border:1px solid var(--line);border-radius:26px;background:color-mix(in srgb,var(--surface) 82%,white 8%);box-shadow:0 25px 80px rgba(14,16,31,.13)}.signal span,.signal small{display:block;color:var(--muted);line-height:1.5}.signal strong{display:block;margin:9px 0 23px;font-size:22px}.meter{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin-bottom:13px}.meter i{display:block;width:84%;height:100%;background:linear-gradient(90deg,var(--accent),var(--soft))}.section{padding:75px 0}.section h2{margin:0 0 28px;font-size:clamp(32px,5vw,58px);line-height:1;letter-spacing:-.05em}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.grid article{padding:20px;border:1px solid var(--line);border-radius:20px;background:color-mix(in srgb,var(--surface) 83%,white 7%)}.grid span{color:var(--accent);font-weight:900}.grid h3{margin:32px 0 8px}.grid p{margin:0;color:var(--muted);font-size:14px;line-height:1.55}.preview-chip{position:fixed;right:13px;bottom:13px;padding:7px 10px;border-radius:99px;background:var(--ink);color:var(--surface);font-size:10px;font-weight:850}
@media(max-width:850px){.hero{grid-template-columns:1fr}.grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.nav nav a{display:none}.hero{padding:42px 0;min-height:auto}.grid{grid-template-columns:1fr}.actions{align-items:stretch;flex-direction:column}.actions>*{text-align:center}}
</style>
</head>
<body>
<header class="nav"><div class="logo">${escapeHtml(plan.title)}</div><nav><a href="#features">Features</a><a href="#journey">Journey</a><button type="button" onclick="document.querySelector('#features').scrollIntoView({behavior:'smooth'})">Get started</button></nav></header>
<main>
<section class="hero">
<div><p class="eyebrow">${escapeHtml(concept?.name ?? "Visual direction")}</p><h1>${escapeHtml(plan.title)}</h1><p class="lede">${escapeHtml(plan.summary)}</p><div class="actions"><button class="primary" type="button" onclick="document.querySelector('#features').scrollIntoView({behavior:'smooth'})">Start now</button><a class="secondary" href="#features">Explore the plan</a></div></div>
<aside class="signal"><span>Designed for</span><strong>${escapeHtml(plan.targetUsers.join(" · "))}</strong><div class="meter"><i></i></div><small>Responsive, accessible, and ready to become a complete application.</small></aside>
</section>
<section class="section" id="features"><p class="eyebrow">Core experience</p><h2>Built around the main outcome</h2><div class="grid">${features}</div></section>
</main>
<div class="preview-chip">Live Ziepher concept</div>
</body>
</html>`;
}

export function StudioShell({
  authenticated,
  userEmail,
  initialProjectId
}: StudioShellProps) {
  const [projectId, setProjectId] = useState<string | undefined>(
    initialProjectId
  );
  const [specVersionId, setSpecVersionId] = useState<string | undefined>();
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<AppPlan>(initialPlan);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Tell me what you want to build. I will turn it into requirements, screens, visual directions, and a safe build sequence. Planning is free."
    }
  ]);
  const [databaseConcepts, setDatabaseConcepts] = useState<DatabaseConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState(
    initialPlan.visualDirections[0]?.id ?? "quiet-premium"
  );
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop"
  );
  const [qualityMode, setQualityMode] = useState<QualityMode>("balanced");
  const [planning, setPlanning] = useState(false);
  const [building, setBuilding] = useState(false);
  const [build, setBuild] = useState<BuildSummary | null>(null);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [deployment, setDeployment] = useState<DeploymentSummary | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [builtPreviewUrl, setBuiltPreviewUrl] = useState<string | null>(null);
  const [localBuild, setLocalBuild] = useState<LocalBuildResult | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [aiContext, setAIContext] = useState<ProjectAIContext>({
    ...emptyProjectAIContext
  });
  const [savingContext, setSavingContext] = useState(false);

  const onRemoteProjectState = useCallback((state: import("@/lib/domain/schemas").ProjectSyncState) => {
    const studio = state.studio;
    if (typeof studio.prompt === "string") setPrompt(studio.prompt);
    if (studio.plan) {
      const parsed = appPlanSchema.safeParse(studio.plan);
      if (parsed.success) setPlan(parsed.data);
    }
    if (studio.selectedConcept) setSelectedConcept(studio.selectedConcept);
    if (studio.qualityMode) setQualityMode(studio.qualityMode);
    if (studio.previewDevice) setDevice(studio.previewDevice);
    if (typeof studio.currentVersion === "number") {
      setCurrentVersion(studio.currentVersion);
    }
    setAIContext(state.aiContext);
  }, []);

  const {
    status: syncStatus,
    revision: syncRevision,
    lastSyncedAt,
    pushPatch: pushProjectPatch
  } = useProjectSync({
    projectId,
    enabled: authenticated && Boolean(projectId),
    onRemoteState: onRemoteProjectState
  });

  const syncStudioState = useCallback(
    async (overrides: Partial<ProjectStudioState> = {}) => {
      if (!authenticated || !projectId) return;
      await pushProjectPatch({
        studio: {
          prompt,
          plan,
          selectedConcept,
          qualityMode,
          previewDevice: device,
          currentVersion,
          updatedAt: new Date().toISOString(),
          ...overrides
        }
      });
    },
    [
      authenticated,
      currentVersion,
      device,
      plan,
      projectId,
      prompt,
      pushProjectPatch,
      qualityMode,
      selectedConcept
    ]
  );

  const { supported, listening, toggle } = useVoiceInput({
    onTranscript(text) {
      setPrompt((current) => `${current}${current ? " " : ""}${text}`);
    }
  });

  const concept =
    plan.visualDirections.find((item) => item.id === selectedConcept) ??
    plan.visualDirections[0];

  const previewDocument = useMemo(
    () => buildPreviewDocument(plan, concept?.id ?? selectedConcept),
    [plan, concept, selectedConcept]
  );


  useEffect(() => {
    if (authenticated || initialProjectId) return;

    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("ziepher-local-project");
        if (!saved) return;
        const parsed = JSON.parse(saved) as {
          prompt?: string;
          plan?: unknown;
          selectedConcept?: string;
          localBuild?: LocalBuildResult | null;
          messages?: Message[];
          aiContext?: ProjectAIContext;
          qualityMode?: QualityMode;
          device?: "desktop" | "tablet" | "mobile";
        };
        if (typeof parsed.prompt === "string") setPrompt(parsed.prompt);
        if (parsed.plan) setPlan(appPlanSchema.parse(parsed.plan));
        if (typeof parsed.selectedConcept === "string") {
          setSelectedConcept(parsed.selectedConcept);
        }
        if (parsed.localBuild?.html) setLocalBuild(parsed.localBuild);
        if (Array.isArray(parsed.messages) && parsed.messages.length) {
          setMessages(parsed.messages);
        }
        if (parsed.aiContext) setAIContext(parsed.aiContext);
        if (parsed.qualityMode) setQualityMode(parsed.qualityMode);
        if (parsed.device) setDevice(parsed.device);
      } catch {
        window.localStorage.removeItem("ziepher-local-project");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authenticated, initialProjectId]);

  useEffect(() => {
    if (authenticated || initialProjectId) return;

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        "ziepher-local-project",
        JSON.stringify({
          prompt,
          plan,
          selectedConcept,
          localBuild,
          messages: messages.slice(-20),
          aiContext,
          qualityMode,
          device
        })
      );
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    authenticated,
    aiContext,
    device,
    initialProjectId,
    localBuild,
    messages,
    plan,
    prompt,
    qualityMode,
    selectedConcept
  ]);

  const loadProject = useCallback(async (id: string) => {
    const response = await fetch(`/api/projects/${id}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as {
      project?: {
        name: string;
        original_idea: string;
        preview_url?: string | null;
        current_version?: number;
        active_spec_version_id?: string | null;
        selected_visual_concept_id?: string | null;
      };
      latestSpec?: { id: string; spec: unknown } | null;
      concepts?: DatabaseConcept[];
      builds?: BuildSummary[];
      messages?: Array<{ sender: string; content: string }>;
      error?: string;
    };

    if (!response.ok || !payload.project) {
      throw new Error(payload.error ?? "Unable to load project.");
    }

    setPrompt(payload.project.original_idea);
    setCurrentVersion(payload.project.current_version ?? 0);
    if (payload.latestSpec) {
      const parsed = appPlanSchema.parse(payload.latestSpec.spec);
      setPlan(parsed);
      setSpecVersionId(payload.latestSpec.id);
    }

    const concepts = payload.concepts ?? [];
    setDatabaseConcepts(concepts);
    const selected =
      concepts.find((item) => item.selected) ??
      concepts.find(
        (item) => item.id === payload.project?.selected_visual_concept_id
      );
    if (selected) setSelectedConcept(sourceId(selected));

    const loadedMessages = (payload.messages ?? [])
      .filter((item) => item.sender === "user" || item.sender === "assistant")
      .map<Message>((item) => ({
        role: item.sender === "user" ? "user" : "ai",
        content: item.content
      }));
    if (loadedMessages.length) setMessages(loadedMessages);

    const latestBuild = payload.builds?.[0];
    if (latestBuild) setBuild(latestBuild);
    if (payload.project.preview_url) {
      setBuiltPreviewUrl(`${payload.project.preview_url}?v=${Date.now()}`);
    }
  }, []);

  useEffect(() => {
    if (!initialProjectId) return;

    const timeout = window.setTimeout(() => {
      void loadProject(initialProjectId).catch((caught: unknown) => {
        setError(
          caught instanceof Error ? caught.message : "Unable to load project."
        );
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialProjectId, loadProject]);

  useEffect(() => {
    if (!build?.id || !building) return;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/builds/${build.id}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as {
          build?: BuildSummary;
          error?: string;
        };
        if (!response.ok || !payload.build) {
          throw new Error(payload.error ?? "Unable to read build status.");
        }

        setBuild(payload.build);
        if (payload.build.status === "completed") {
          setBuilding(false);
          window.clearInterval(timer);
          if (projectId) {
            setBuiltPreviewUrl(
              `/api/projects/${projectId}/preview?build=${payload.build.id}`
            );
            setPreviewKey((current) => current + 1);
            void loadProject(projectId);
          }
          setMessages((current) => [
            ...current,
            {
              role: "ai",
              content:
                "The application passed generation, type checking, production build, and security checks. The completed preview is now open on the right."
            }
          ]);
        }

        if (
          payload.build.status === "failed" ||
          payload.build.status === "cancelled"
        ) {
          setBuilding(false);
          window.clearInterval(timer);
          setError(
            payload.build.failure_message ??
              "The build failed. Its reserved credits were released."
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to monitor the build."
        );
      }
    }, 2200);

    return () => window.clearInterval(timer);
  }, [build?.id, building, loadProject, projectId]);

  useEffect(() => {
    if (!deployment?.id || !deploying || !projectId) return;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/deployments/${deployment.id}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as {
          deployment?: DeploymentSummary;
          error?: string;
        };
        if (!response.ok || !payload.deployment) {
          throw new Error(payload.error ?? "Unable to read deployment status.");
        }

        const activeDeployment = payload.deployment;
        setDeployment(activeDeployment);
        if (activeDeployment.status === "ready") {
          setDeploying(false);
          window.clearInterval(timer);
          if (activeDeployment.url) {
            setBuiltPreviewUrl(activeDeployment.url);
            setPreviewKey((current) => current + 1);
          }
          setMessages((current) => [
            ...current,
            {
              role: "ai",
              content: `${activeDeployment.environment === "production" ? "Production" : "Preview"} deployment is ready.`
            }
          ]);
        }

        if (
          activeDeployment.status === "failed" ||
          activeDeployment.status === "cancelled"
        ) {
          setDeploying(false);
          window.clearInterval(timer);
          setError(
            activeDeployment.failure_message ?? "The deployment failed."
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to monitor deployment."
        );
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [deployment?.id, deploying, projectId]);

  async function requestJson<T>(url: string, init: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });
    const payload = (await response.json()) as T & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "The request failed.");
    }
    return payload;
  }

  async function createPlan() {
    const idea = prompt.trim();
    if (!idea || planning) return;

    setError(null);
    setPlanning(true);
    setBuiltPreviewUrl(null);
    setLocalBuild(null);
    setMessages((current) => [
      ...current,
      { role: "user", content: idea },
      {
        role: "ai",
        content:
          "I am turning that into a complete plan, visual directions, screens, and the safest build order."
      }
    ]);

    try {
      let activeProjectId = projectId;

      if (authenticated && !activeProjectId) {
        const created = await requestJson<{
          project: { id: string };
        }>("/api/projects", {
          method: "POST",
          body: JSON.stringify({
            name: nameFromIdea(idea),
            idea
          })
        });
        activeProjectId = created.project.id;
        setProjectId(activeProjectId);
        window.history.replaceState(
          {},
          "",
          `/projects/${activeProjectId}`
        );
      }

      const result: {
        plan: AppPlan;
        provider: string;
        specVersionId?: string;
        concepts?: DatabaseConcept[];
      } = activeProjectId
        ? await requestJson<{
            plan: AppPlan;
            provider: string;
            specVersionId: string;
            concepts: DatabaseConcept[];
          }>(`/api/projects/${activeProjectId}/plan`, {
            method: "POST",
            body: JSON.stringify({ idea, context: aiContext })
          })
        : await requestJson<{
            plan: AppPlan;
            provider: string;
          }>("/api/plan", {
            method: "POST",
            body: JSON.stringify({ idea, context: aiContext })
          });

      setPlan(result.plan);
      setSelectedConcept(
        result.plan.visualDirections[0]?.id ?? "quiet-premium"
      );
      if (result.specVersionId) {
        setSpecVersionId(result.specVersionId);
        setDatabaseConcepts(result.concepts ?? []);
      }

      const nextContext: ProjectAIContext = {
        ...aiContext,
        vision: aiContext.vision || result.plan.summary,
        targetUsers: aiContext.targetUsers.length
          ? aiContext.targetUsers
          : result.plan.targetUsers,
        requirements: aiContext.requirements.length
          ? aiContext.requirements
          : result.plan.features
              .filter((feature) => feature.priority === "must")
              .map((feature) => `${feature.name}: ${feature.description}`)
      };
      setAIContext(nextContext);
      if (activeProjectId && activeProjectId === projectId) {
        void pushProjectPatch({
          studio: {
            prompt: idea,
            plan: result.plan,
            selectedConcept:
              result.plan.visualDirections[0]?.id ?? "quiet-premium",
            qualityMode,
            previewDevice: device,
            currentVersion,
            updatedAt: new Date().toISOString()
          },
          aiContext: nextContext
        });
      }

      setMessages((current) => [
        ...current.slice(0, -1),
        {
          role: "ai",
          content: `The free plan is ready using ${result.provider}. Compare the visual directions, mix the best ideas, then build when the plan feels right.`
        }
      ]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Planning failed."
      );
      setMessages((current) => [
        ...current.slice(0, -1),
        {
          role: "ai",
          content:
            "Planning could not be completed, but no build credits were used."
        }
      ]);
    } finally {
      setPlanning(false);
    }
  }

  async function chooseConcept(conceptId: string) {
    setSelectedConcept(conceptId);
    const databaseConcept = databaseConcepts.find(
      (item) => sourceId(item) === conceptId
    );

    if (!projectId || !databaseConcept) return;
    try {
      await requestJson(`/api/projects/${projectId}/concept`, {
        method: "POST",
        body: JSON.stringify({ visualConceptId: databaseConcept.id })
      });
      await syncStudioState({ selectedConcept: conceptId });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save visual selection."
      );
    }
  }

  async function buildApplication() {
    if (building || planning) return;

    setError(null);
    setBuilding(true);
    setBuild({ id: "local", status: "generating" });
    setMessages((current) => [
      ...current,
      {
        role: "ai",
        content: authenticated
          ? "The build is queued. Ziepher will generate, validate, test, and publish a versioned preview."
          : "I am building a complete local application now. It will run in the preview and can be downloaded as a standalone HTML app."
      }
    ]);

    if (!authenticated) {
      try {
        const result = await requestJson<LocalBuildResult>("/api/local/build", {
          method: "POST",
          body: JSON.stringify({
            idea: prompt.trim() || plan.summary,
            plan,
            conceptId: selectedConcept,
            qualityMode,
            context: aiContext
          })
        });

        setLocalBuild(result);
        setBuiltPreviewUrl(null);
        setCurrentVersion(result.version);
        setBuild({ id: result.buildId, status: "completed" });
        setPreviewKey((current) => current + 1);
        setMessages((current) => [
          ...current,
          {
            role: "ai",
            content:
              "The local app is built and working. Test it on the right, open it in a new tab, or download the standalone app file."
          }
        ]);
      } catch (caught) {
        setBuild({ id: "local", status: "failed" });
        setError(
          caught instanceof Error ? caught.message : "Unable to build the local app."
        );
      } finally {
        setBuilding(false);
      }
      return;
    }

    if (!projectId || !specVersionId) {
      setBuilding(false);
      setBuild(null);
      setError("Create and save a complete plan before building.");
      return;
    }

    try {
      const databaseConcept = databaseConcepts.find(
        (item) => sourceId(item) === selectedConcept
      );
      if (databaseConcept) {
        await requestJson(`/api/projects/${projectId}/concept`, {
          method: "POST",
          body: JSON.stringify({ visualConceptId: databaseConcept.id })
        });
      }

      await requestJson(`/api/projects/${projectId}/approve`, {
        method: "POST",
        body: JSON.stringify({ specVersionId })
      });

      const queued = await requestJson<{ buildJobId: string }>("/api/builds", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          approvedSpecVersionId: specVersionId,
          requestedMode: qualityMode
        })
      });

      setBuild({ id: queued.buildJobId, status: "queued" });
    } catch (caught) {
      setBuilding(false);
      setError(
        caught instanceof Error ? caught.message : "Unable to start build."
      );
    }
  }

  async function deployApplication(
    environment: "preview" | "production"
  ) {
    if (!projectId || currentVersion < 1 || deploying) return;

    setError(null);
    setDeploying(true);
    try {
      const queued = await requestJson<{ deploymentId: string }>(
        `/api/projects/${projectId}/deployments`,
        {
          method: "POST",
          body: JSON.stringify({
            version: currentVersion,
            provider: "vercel",
            environment
          })
        }
      );
      setDeployment({
        id: queued.deploymentId,
        status: "queued",
        environment
      });
    } catch (caught) {
      setDeploying(false);
      setError(
        caught instanceof Error ? caught.message : "Unable to deploy application."
      );
    }
  }

  function openPreview() {
    if (builtPreviewUrl) {
      window.open(builtPreviewUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const documentToOpen = localBuild?.html ?? previewDocument;
    const blob = new Blob([documentToOpen], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function downloadLocalBuild() {
    if (!localBuild) return;

    const blob = new Blob([localBuild.html], {
      type: "text/html;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${localBuild.slug}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  function clearLocalProject() {
    window.localStorage.removeItem("ziepher-local-project");
    setPrompt("");
    setPlan(initialPlan);
    setSelectedConcept(
      initialPlan.visualDirections[0]?.id ?? "quiet-premium"
    );
    setLocalBuild(null);
    setBuiltPreviewUrl(null);
    setBuild(null);
    setCurrentVersion(0);
    setAIContext({ ...emptyProjectAIContext });
    setMessages([
      {
        role: "ai",
        content:
          "Tell me what you want to build. Planning is free, and local builds work without an account."
      }
    ]);
    setPreviewKey((current) => current + 1);
  }

  async function saveAIContext() {
    setSavingContext(true);
    setError(null);
    try {
      if (authenticated && projectId) {
        await pushProjectPatch({ aiContext }, "context.patch");
      } else {
        window.localStorage.setItem(
          "ziepher-local-project",
          JSON.stringify({
            prompt,
            plan,
            selectedConcept,
            localBuild,
            messages: messages.slice(-20),
            aiContext,
            qualityMode,
            device
          })
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save AI context."
      );
    } finally {
      setSavingContext(false);
    }
  }

  async function checkpointDesktopBridge(
    workspaceName: string,
    checkpointSha256: string
  ) {
    if (authenticated && projectId) {
      await pushProjectPatch(
        {
          bridge: {
            workspaceName,
            lastCheckpointAt: new Date().toISOString(),
            lastCheckpointSha256: checkpointSha256
          }
        },
        "bridge.checkpoint"
      );
    }
  }

  return (
    <main className="studio">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER AI</div>
            <div className="brand-subtitle">BUILD YOUR DREAMS</div>
          </div>
        </div>

        <div className="top-actions">
          <DesktopBridgeControl
            projectId={projectId}
            onCheckpoint={checkpointDesktopBridge}
          />
          <PwaInstall />
          <span className="status-pill free">Planning is free</span>
          {authenticated && projectId ? (
            <span
              className={`status-pill sync-${syncStatus}`}
              title={lastSyncedAt ? `Last synchronized ${lastSyncedAt}` : "Connecting project sync"}
            >
              Sync: {syncStatus}
            </span>
          ) : null}
          {!authenticated ? (
            <span className="status-pill">Local working mode</span>
          ) : null}
          <select
            className="quality-select"
            aria-label="Build quality mode"
            value={qualityMode}
            onChange={(event) => {
              const nextMode = event.target.value as QualityMode;
              setQualityMode(nextMode);
              void syncStudioState({ qualityMode: nextMode });
            }}
          >
            <option value="economy">Economy</option>
            <option value="balanced">Balanced</option>
            <option value="best">Best quality</option>
          </select>
          {authenticated ? (
            <>
              <Link className="button" href="/projects">
                Projects
              </Link>
              <Link className="button" href="/settings/billing">
                Billing
              </Link>
              <span className="user-chip" title={userEmail}>
                {userEmail?.split("@")[0]}
              </span>
            </>
          ) : (
            <Link className="button" href="/auth/sign-in">
              Sign in
            </Link>
          )}
          {!authenticated ? (
            <button className="button" type="button" onClick={clearLocalProject}>
              New project
            </button>
          ) : null}
          <button
            className="button primary"
            onClick={buildApplication}
            disabled={building || planning}
          >
            {building
              ? `Building · ${build?.status ?? "queued"}`
              : "Build app"}
          </button>
        </div>
      </header>

      <section className="workspace">
        <section className="panel" aria-label="AI idea conversation">
          <div className="panel-header">
            <div>
              <span className="panel-label">Idea</span>
              <span className="panel-title">AI planning brain</span>
            </div>
            <button
              className="button compact"
              onClick={() => setShowTemplates((current) => !current)}
            >
              {showTemplates ? "Hide templates" : "Templates"}
            </button>
          </div>

          {showTemplates ? (
            <div className="template-strip" aria-label="App templates">
              {appTemplates.map((template) => (
                <button
                  className="template-card"
                  key={template.id}
                  onClick={() => setPrompt(template.starterPrompt)}
                  title={template.description}
                >
                  <span>{template.icon}</span>
                  <strong>{template.name}</strong>
                </button>
              ))}
            </div>
          ) : null}

          <ProjectContextPanel
            context={aiContext}
            onChange={setAIContext}
            onSave={() => void saveAIContext()}
            saving={savingContext}
            syncStatus={syncStatus}
            cloudEnabled={authenticated && Boolean(projectId)}
          />

          <div className="scroll chat">
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={index}>
                {message.content}
              </div>
            ))}
          </div>

          <div className="composer">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Speak or type the app you want to create..."
              aria-label="Describe your app idea"
            />
            {error ? <div className="error-text">{error}</div> : null}
            <div className="composer-row">
              <button
                className={`button ${listening ? "recording" : ""}`}
                onClick={toggle}
                disabled={!supported}
                title={
                  supported
                    ? "Start or stop voice input"
                    : "Voice recognition is not available in this browser"
                }
              >
                {listening ? "● Listening" : "🎙 Voice"}
              </button>
              <button
                className="button primary"
                onClick={createPlan}
                disabled={!prompt.trim() || planning}
              >
                {planning ? "Planning…" : "Create free plan"}
              </button>
            </div>
          </div>
        </section>

        <section className="panel" aria-label="Visual build plan">
          <div className="panel-header">
            <div>
              <span className="panel-label">Visual plan</span>
              <span className="panel-title">See it before building it</span>
            </div>
            <span className="status-pill free">0 planning credits</span>
          </div>

          <div className="scroll">
            <div className="hero-plan">
              <span className="panel-label">Generated direction</span>
              <h1>{plan.title}</h1>
              <p>{plan.summary}</p>
              <div className="plan-stats">
                <span>{plan.features.length} features</span>
                <span>{plan.screens.length} screens</span>
                <span>{plan.visualDirections.length} visual options</span>
              </div>
            </div>

            <div className="section-heading">
              <h2>Choose or mix visual directions</h2>
              <span className="status-pill">Many options</span>
            </div>
            <div className="card-grid">
              {plan.visualDirections.map((item, index) => (
                <button
                  className={`concept-card concept-${index + 1} ${
                    selectedConcept === item.id ? "selected" : ""
                  }`}
                  onClick={() => chooseConcept(item.id)}
                  key={item.id}
                  aria-pressed={selectedConcept === item.id}
                >
                  <div className="concept-art">
                    <i />
                    <i />
                    <i />
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </button>
              ))}
            </div>

            <div className="section-heading">
              <h2>Screen map</h2>
              <span className="status-pill">{plan.screens.length} screens</span>
            </div>
            <div className="screen-map">
              {plan.screens.map((screen, index) => (
                <article key={`${screen.name}-${index}`}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{screen.name}</h3>
                    <p>{screen.purpose}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="section-heading">
              <h2>Core features</h2>
              <span className="status-pill">{plan.features.length} planned</span>
            </div>
            <div className="feature-list">
              {plan.features.map((feature, index) => (
                <article className="feature-card" key={`${feature.name}-${index}`}>
                  <span className="icon-square">{index + 1}</span>
                  <div>
                    <h3>{feature.name}</h3>
                    <p>{feature.description}</p>
                  </div>
                  <span className="status-pill">{feature.priority}</span>
                </article>
              ))}
            </div>

            <div className="section-heading">
              <h2>Safe build sequence</h2>
            </div>
            <div className="phase-list">
              {plan.buildPhases.map((phase, index) => (
                <article className="phase-card" key={`${phase.name}-${index}`}>
                  <span className="icon-square">{index + 1}</span>
                  <div>
                    <h3>{phase.name}</h3>
                    <p>{phase.outcome}</p>
                  </div>
                  <span className={`status-pill ${phase.billable ? "" : "free"}`}>
                    {phase.billable ? "Build credits" : "Free"}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel preview-panel" aria-label="Live app preview">
          <div className="panel-header">
            <div>
              <span className="panel-label">Live preview</span>
              <span className="panel-title">Click and test the app</span>
            </div>
            <span className={`status-pill ${build?.status === "completed" ? "free" : ""}`}>
              {build?.status ?? "Concept preview"}
            </span>
          </div>

          <div className="preview-toolbar">
            <div className="mode-switch">
              {(["desktop", "tablet", "mobile"] as const).map((mode) => (
                <button
                  key={mode}
                  className="button"
                  aria-pressed={device === mode}
                  onClick={() => {
                    setDevice(mode);
                    void syncStudioState({ previewDevice: mode });
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="inline-actions">
              {projectId ? (
                <Link
                  className="button"
                  href={`/projects/${projectId}/history`}
                >
                  History
                </Link>
              ) : null}
              {projectId && builtPreviewUrl ? (
                <a
                  className="button"
                  href={`/api/projects/${projectId}/source`}
                >
                  Source
                </a>
              ) : null}
              {localBuild ? (
                <button
                  className="button"
                  type="button"
                  onClick={downloadLocalBuild}
                >
                  Download app
                </button>
              ) : null}
              {projectId && currentVersion > 0 ? (
                <>
                  <button
                    className="button"
                    disabled={deploying}
                    onClick={() => void deployApplication("preview")}
                  >
                    {deploying && deployment?.environment === "preview"
                      ? "Deploying…"
                      : "Deploy preview"}
                  </button>
                  <button
                    className="button primary"
                    disabled={deploying}
                    onClick={() => void deployApplication("production")}
                  >
                    {deploying && deployment?.environment === "production"
                      ? "Going live…"
                      : "Go live"}
                  </button>
                </>
              ) : null}
              <button className="button" onClick={openPreview}>
                Open
              </button>
              <button
                className="button"
                onClick={() => setPreviewKey((current) => current + 1)}
              >
                Refresh
              </button>
            </div>
          </div>

          {building ? (
            <div className="build-progress">
              <div className="build-progress-bar">
                <i className={`status-${build?.status ?? "queued"}`} />
              </div>
              <div>
                <strong>Building in an isolated runner</strong>
                <span>
                  {build?.status ?? "queued"} · failed system work is not charged
                </span>
              </div>
            </div>
          ) : null}

          <div className="preview-stage">
            {builtPreviewUrl ? (
              <iframe
                key={`${previewKey}-${builtPreviewUrl}`}
                className={`preview-frame ${device}`}
                title="Built application preview"
                sandbox="allow-forms allow-modals allow-popups allow-scripts"
                src={builtPreviewUrl}
              />
            ) : (
              <iframe
                key={previewKey}
                className={`preview-frame ${device}`}
                title="Generated application concept preview"
                sandbox="allow-forms allow-modals allow-popups allow-scripts"
                srcDoc={localBuild?.html ?? previewDocument}
              />
            )}
          </div>
        </section>
      </section>

      <footer className="bottom-bar">
        <span>
          Core → data → auth → features → tests → money connections last
        </span>
        <span>
          {projectId ? `Project ${projectId.slice(0, 8)}` : "Local planning mode"}
          {" · "}
          checkpoint 007{projectId ? ` · sync r${syncRevision}` : ""}
        </span>
      </footer>
    </main>
  );
}
