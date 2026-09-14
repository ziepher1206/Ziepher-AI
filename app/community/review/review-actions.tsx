import {
  rejectContributionAction,
  verifyContributionAction,
} from "./actions";

const scoringFields = [
  ["quality", "Quality"],
  ["originality", "Originality"],
  ["reliability", "Reliability"],
  ["documentationValue", "Documentation"],
  ["reviewEffort", "Review effort"],
  ["moduleImportance", "Module importance"],
  ["ongoingResponsibility", "Ongoing responsibility"],
  ["securityImportance", "Security importance"],
] as const;

export function ContributionReviewActions({ eventId }: { eventId: string }) {
  return (
    <details className="zlife-review-decision">
      <summary>Review contribution</summary>

      <div className="zlife-review-decision-grid">
        <form action={verifyContributionAction} className="zlife-review-form">
          <input type="hidden" name="eventId" value={eventId} />
          <h4>Verify contribution</h4>
          <p>Score reviewer-controlled factors from 0 to 100. The final verified score is calculated server-side.</p>
          <div className="zlife-review-score-grid">
            {scoringFields.map(([name, label]) => (
              <label key={name}>
                <span>{label}</span>
                <input name={name} type="number" min="0" max="100" defaultValue="50" required />
              </label>
            ))}
          </div>
          <label className="zlife-review-reason">
            <span>Verification reason</span>
            <textarea name="reason" minLength={3} maxLength={2000} required />
          </label>
          <button type="submit" className="zlife-review-verify">Verify contribution</button>
        </form>

        <form action={rejectContributionAction} className="zlife-review-form zlife-review-reject-form">
          <input type="hidden" name="eventId" value={eventId} />
          <h4>Reject contribution evidence</h4>
          <p>Use rejection only when the evidence should not receive verified contribution value.</p>
          <label className="zlife-review-reason">
            <span>Rejection reason</span>
            <textarea name="reason" minLength={3} maxLength={2000} required />
          </label>
          <button type="submit" className="zlife-review-reject">Reject evidence</button>
        </form>
      </div>
    </details>
  );
}
