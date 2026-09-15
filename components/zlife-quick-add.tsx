import { addDailyItemAction } from "@/app/today/actions";

const kinds = [
  ["task", "Task"],
  ["appointment", "Appointment"],
  ["reminder", "Reminder"],
  ["payment_due", "Payment due"],
  ["subscription_due", "Subscription due"],
  ["school", "School activity"],
  ["shopping", "Grocery / shopping"],
  ["errand", "Errand"],
  ["health", "Health"],
  ["business", "Business"],
  ["vehicle", "Auto / vehicle"],
  ["document", "Document / paperwork"],
  ["family", "Family"],
  ["other", "Other"]
] as const;

export function ZLifeQuickAdd() {
  return (
    <section style={{ border: "1px solid rgba(78,234,221,.24)", borderRadius: 18, padding: 22, background: "linear-gradient(145deg,rgba(7,43,46,.84),rgba(3,22,25,.94))", boxShadow: "0 18px 55px rgba(0,0,0,.24)" }}>
      <div style={{ marginBottom: 16 }}>
        <p className="panel-label" style={{ color: "#38e0f3" }}>Quick add</p>
        <h2 style={{ margin: "4px 0 5px" }}>Put something into My Day.</h2>
        <p style={{ margin: 0, color: "#789b97", fontSize: 13 }}>Add a reminder, appointment, school activity, grocery stop, bill, subscription, errand, task, or anything else without opening another app.</p>
      </div>

      <form action={addDailyItemAction} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          <label className="field">
            <span>Type</span>
            <select name="itemKind" defaultValue="task">
              {kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Priority</span>
            <select name="priority" defaultValue="normal">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="field">
            <span>When</span>
            <input type="datetime-local" name="dueAt" />
          </label>
          <label className="field">
            <span>Repeat</span>
            <select name="repeat" defaultValue="once">
              <option value="once">Does not repeat</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
              <option value="yearly">Every year</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>What do you need to remember or do?</span>
          <input name="title" required maxLength={240} placeholder="Example: Pick up groceries after school pickup" />
        </label>

        <label className="field">
          <span>Optional details</span>
          <textarea name="detail" rows={2} maxLength={1200} placeholder="Add a location, note, amount due, person involved, or anything else useful." />
        </label>

        <div className="inline-actions">
          <button className="button primary" type="submit" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112", border: 0 }}>Add to My Day</button>
          <span style={{ color: "#789b97", fontSize: 12 }}>Stored in your workspace · repeating items roll forward when completed · no paid AI call</span>
        </div>
      </form>
    </section>
  );
}
