"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CampaignDraftForm({
  projectId,
  workspaceId
}: {
  projectId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [website, setWebsite] = useState(true);
  const [social, setSocial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sign in again before creating a campaign.");

      const channels = [website ? "website" : null, social ? "social" : null].filter(
        (value): value is string => Boolean(value)
      );
      if (!channels.length) throw new Error("Choose at least one campaign channel.");

      const startsAt = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null;
      const endsAt = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null;
      if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
        throw new Error("End date must be on or after the start date.");
      }

      const { error } = await supabase.from("marketing_campaigns").insert({
        workspace_id: workspaceId,
        project_id: projectId,
        created_by: user.id,
        name: name.trim(),
        campaign_type: "website_promotion",
        status: "draft",
        instructions: instructions.trim(),
        offer_details: {},
        channels,
        starts_at: startsAt,
        ends_at: endsAt,
        requires_financial_approval: false,
        campaign_metadata: {
          source: "ziepher_growth_workspace",
          ai_generation_status: "not_requested"
        }
      });
      if (error) throw error;

      setName("");
      setInstructions("");
      setStartDate("");
      setEndDate("");
      setWebsite(true);
      setSocial(false);
      setMessage("Draft saved. Nothing has been generated or published yet.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to save campaign draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit} style={{ maxWidth: 720 }}>
      <div>
        <p className="panel-label">New promotion request</p>
        <h2 style={{ marginTop: 6 }}>Tell Ziepher what you want to promote</h2>
        <p className="auth-copy">
          Save the business request, timing, and channels first. This step does not call a paid AI model and does not publish anything.
        </p>
      </div>

      <label>
        Campaign name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          maxLength={160}
          placeholder="September stump grinding promotion"
          required
        />
      </label>

      <label>
        What should Ziepher prepare?
        <textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          minLength={10}
          maxLength={4000}
          rows={5}
          placeholder="Add a 15% off stump grinding promotion starting today through the end of the month. Make the main call to action request an estimate."
          required
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <label>
          Start date
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: 8 }}>Channels</legend>
        <div className="inline-actions">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={website} onChange={(event) => setWebsite(event.target.checked)} />
            Website
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={social} onChange={(event) => setSocial(event.target.checked)} />
            Social content draft
          </label>
        </div>
      </fieldset>

      {message ? <div className="auth-message">{message}</div> : null}

      <button className="button primary auth-submit" disabled={busy}>
        {busy ? "Saving…" : "Save campaign draft"}
      </button>
    </form>
  );
}
