import Link from "next/link";

import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStudioTasks } from "@/lib/community/studio-tasks";
import "../community.css";
import StudioWorkspaceClient from "./workspace-client";

const paths = [
  ["Build a feature", "Choose an open product task, work in a fork or sandbox branch, and submit a pull request."],
  ["Test ZLife", "Run the localhost visual workflow, reproduce bugs, and report exact steps and screenshots."],
  ["Improve design", "Propose clearer interfaces, mobile fixes, accessibility improvements, or better onboarding."],
  ["Share expertise", "Explain real industry workflows so ZLife can turn domain knowledge into better software."],
  ["Translate", "Help make ZLife understandable to more people without changing product behavior."],
  ["Report a problem", "Submit a reproducible bug without exposing private data or secrets."],
] as const;

type HistoryItem = {
  id: string;
  title: string;
  state: string;
  issueNumber: number | null;
  updatedAt: string;
};

type ReviewOutcome = {
  id: string;
  title: string;
  action: "verified" | "rejected";
  reason: string;
  verifiedScore: number | null;
  reviewedAt: string;
};

async function getContributorIdentity() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let contributor: { id: string; display_name: string | null; status: string; is_verified: boolean } | null = null;
    let activeTaskId: string | null = null;
    let activeTaskState = "claimed";
    let history: HistoryItem[] = [];
    let reviewOutcomes: ReviewOutcome[] = [];

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const result = await admin
        .from("community_contributors")
        .select("id, display_name, status, is_verified")
        .eq("user_id", user.id)
        .maybeSingle();
      contributor = result.data ?? null;

      if (contributor) {
        const eventResult = await admin
          .from("contribution_events")
          .select("id, github_issue_id, description, status, metadata, updated_at")
          .eq("contributor_id", contributor.id)
          .eq("repository", "ziepher1206/Ziepher-AI")
          .order("updated_at", { ascending: false })
          .limit(8);

        history = (eventResult.data ?? []).map((event) => {
          const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
            ? event.metadata as Record<string, unknown>
            : {};
          const metadataState = typeof metadata.claim_state === "string" ? metadata.claim_state : null;
          const title = typeof metadata.task_title === "string" ? metadata.task_title : event.description;
          const state = event.status === "verified" || event.status === "rejected" || event.status === "superseded"
            ? event.status
            : metadataState ?? "claimed";
          return {
            id: event.id,
            title,
            state,
            issueNumber: typeof event.github_issue_id === "number" ? event.github_issue_id : null,
            updatedAt: event.updated_at,
          };
        });

        const eventIds = history.map((item) => item.id);
        if (eventIds.length) {
          const reviewResult = await admin
            .from("contribution_review_events")
            .select("id, contribution_event_id, action, reason, new_verified_score, created_at")
            .in("contribution_event_id", eventIds)
            .order("created_at", { ascending: false })
            .limit(8);

          const historyById = new Map(history.map((item) => [item.id, item]));
          reviewOutcomes = (reviewResult.data ?? [])
            .filter((review) => review.action === "verified" || review.action === "rejected")
            .map((review) => ({
              id: review.id,
              title: historyById.get(review.contribution_event_id)?.title ?? "ZLife contribution",
              action: review.action as "verified" | "rejected",
              reason: review.reason,
              verifiedScore: typeof review.new_verified_score === "number" ? review.new_verified_score : null,
              reviewedAt: review.created_at,
            }));
        }

        const active = history.find((item) => item.state === "claimed" || item.state === "submitted" || item.state === "under_review");
        if (active) {
          const activeEvent = (eventResult.data ?? []).find((event) => event.id === active.id);
          const metadata = activeEvent?.metadata && typeof activeEvent.metadata === "object" && !Array.isArray(activeEvent.metadata)
            ? activeEvent.metadata as Record<string, unknown>
            : {};
          activeTaskId = typeof metadata.studio_task_id === "string" ? metadata.studio_task_id : null;
          activeTaskState = active.state;
        }
      }
    }

    const metadataName = typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

    return {
      authenticated: true as const,
      email: user.email ?? null,
      displayName: contributor?.display_name ?? metadataName,
      status: contributor?.status ?? "community_member",
      verified: contributor?.is_verified ?? false,
      activeTaskId,
      activeTaskState,
      history,
      reviewOutcomes,
    };
  } catch {
    return null;
  }
}

export default async function CommunityStudioPage() {
  const [tasks, identity] = await Promise.all([getStudioTasks(), getContributorIdentity()]);

  return (
    <main className="zlife-landing zlife-community-page">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home">
          <span className="zlife-mark" aria-hidden="true"><span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span></span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="ZLife Studio navigation">
          <Link href="/community">Community</Link>
          <Link href="/community/value">Proof of Value</Link>
          <a href="https://github.com/ziepher1206/Ziepher-AI/issues" target="_blank" rel="noreferrer">Open Tasks</a>
        </nav>
      </header>

      <section className="zlife-community-hero">
        <p className="zlife-eyebrow">ZLIFE STUDIO · PUBLIC PLAYGROUND</p>
        <h1>Choose how you want to help.</h1>
        <p className="zlife-lede">ZLife Studio is the safe public entry point for people and AI-assisted builders to improve the company together. Public work stays isolated from production until it passes the release gates.</p>
        <div className="zlife-community-flow"><span>Choose</span><b>→</b><span>Build/Test</span><b>→</b><span>Submit</span><b>→</b><span>CI + Visual E2E</span><b>→</b><span>Review</span><b>→</b><span>Verified Value</span></div>
      </section>

      <section className="zlife-section">
        <StudioWorkspaceClient tasks={tasks} identity={identity} />
      </section>

      {identity?.reviewOutcomes.length ? (
        <section className="zlife-section">
          <div className="zlife-section-heading">
            <div>
              <p className="zlife-kicker">REVIEW RESULTS</p>
              <h2>See why your work was accepted or rejected.</h2>
              <p>These results come from ZLife&apos;s protected maintainer audit history, not browser-local state. A verified score is contribution value evidence, not a cash payout or ownership promise.</p>
            </div>
          </div>
          <div className="zlife-studio-task-grid">
            {identity.reviewOutcomes.map((outcome) => (
              <article className="zlife-studio-task" key={outcome.id}>
                <div className="zlife-studio-task-meta">
                  <span>{outcome.action === "verified" ? "Verified" : "Rejected"}</span>
                  <span>{new Date(outcome.reviewedAt).toLocaleDateString()}</span>
                </div>
                <h3>{outcome.title}</h3>
                <p>{outcome.reason}</p>
                {outcome.action === "verified" && outcome.verifiedScore !== null ? (
                  <small>Verified contribution score: {outcome.verifiedScore}</small>
                ) : (
                  <small>No verified value was awarded.</small>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="zlife-section">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">CONTRIBUTION PATHS</p><h2>You do not need to be a programmer.</h2><p>Pick the kind of work you are good at. ZLife can turn useful human expertise, testing, design, and code into structured product improvements.</p></div></div>
        <div className="zlife-community-role-grid">
          {paths.map(([title, description], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="zlife-section zlife-community-build">
        <div>
          <p className="zlife-kicker">START BUILDING</p>
          <h2>The playground is open; production is not.</h2>
          <p>Use the public repository, mock providers, localhost visual testing, and your own development resources. No contributor needs Ziepher Tech production secrets to begin.</p>
        </div>
        <div className="zlife-hero-actions">
          <a className="zlife-primary" href="https://github.com/ziepher1206/Ziepher-AI/issues" target="_blank" rel="noreferrer">Choose an Open Task <span>→</span></a>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI" target="_blank" rel="noreferrer">Open the ZLife Repository</a>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI/blob/main/docs/START-HERE-CONTRIBUTORS.md" target="_blank" rel="noreferrer">Builder Setup</a>
          <Link className="zlife-secondary" href="/community/value">How Value Is Measured</Link>
        </div>
        <p className="zlife-community-empty">Paid contributor rewards and subscription billing are not activated by this screen. When those programs launch, their terms, eligibility, payout logic, and pricing must be published separately before money changes hands.</p>
      </section>
    </main>
  );
}
