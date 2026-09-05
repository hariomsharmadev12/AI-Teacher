interface SectionOutcome {
  title: string;
  verdict: "correct" | "partial" | "wrong";
}

export default function LessonSummary({
  strong,
  weak,
  minutesUsed,
  timeBudgetMinutes,
  minutesLeft,
  canOfferMore,
  addingMore,
  addMoreError,
  sessionClosed,
  onPracticeWeak,
  onAddMoreTopics,
  onClose,
}: {
  strong: SectionOutcome[];
  weak: SectionOutcome[];
  minutesUsed: number;
  timeBudgetMinutes: number;
  minutesLeft: number;
  canOfferMore: boolean;
  addingMore: boolean;
  addMoreError: string | null;
  sessionClosed: boolean;
  onPracticeWeak: () => void;
  onAddMoreTopics: () => void;
  onClose: () => void;
}) {
  const attempted = strong.length + weak.length;

  return (
    <div
      className="mt-3 rounded-sm border px-6 py-8"
      style={{ borderColor: "var(--chalk-rule)", background: "var(--board-panel)" }}
    >
      <p className="font-utility text-xs uppercase tracking-widest text-chalk-yellow">
        {sessionClosed ? "Session closed" : "Lesson complete"}
      </p>
      <h2 className="font-display text-2xl mt-1">
        {sessionClosed ? "Nice work today." : "How you did"}
      </h2>
      <p className="mt-2 text-sm text-chalk-dim">
        {attempted > 0
          ? `${strong.length} of ${attempted} topic${attempted === 1 ? "" : "s"} checked out cleanly.`
          : "You wrapped up before answering any checkpoints."}{" "}
        You studied for about {Math.max(0, Math.round(minutesUsed))} of your {timeBudgetMinutes}{" "}
        planned minutes.
      </p>

      {strong.length > 0 && (
        <div className="mt-6">
          <p
            className="font-utility text-[11px] uppercase tracking-widest"
            style={{ color: "var(--chalk-sage)" }}
          >
            Strong areas
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {strong.map((o) => (
              <li key={o.title} className="text-sm text-chalk-dim">
                ✓ {o.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {weak.length > 0 && (
        <div className="mt-6">
          <p
            className="font-utility text-[11px] uppercase tracking-widest"
            style={{ color: "var(--chalk-coral)" }}
          >
            Worth another look
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {weak.map((o) => (
              <li key={o.title} className="text-sm text-chalk-dim">
                — {o.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {attempted === 0 && (
        <p className="mt-6 text-sm text-chalk-dim">
          No checkpoints were answered this session, so there&rsquo;s nothing to review yet.
        </p>
      )}

      {canOfferMore && (
        <div
          className="mt-6 rounded-sm border-l-2 pl-4 py-1"
          style={{ borderColor: "var(--chalk-yellow)" }}
        >
          <p className="text-sm">
            You&rsquo;ve still got about {Math.round(minutesLeft)} minutes left in your session.
            Want to keep going with a few more topics on this subject?
          </p>
          {addMoreError && (
            <p className="mt-2 text-sm" style={{ color: "var(--chalk-coral)" }}>
              {addMoreError}
            </p>
          )}
          <button
            onClick={onAddMoreTopics}
            disabled={addingMore}
            className="mt-3 rounded-sm px-4 py-2 font-utility text-xs uppercase tracking-widest disabled:opacity-40"
            style={{ background: "var(--chalk-yellow)", color: "var(--board)" }}
          >
            {addingMore ? "Finding more topics…" : "Yes, add more topics"}
          </button>
        </div>
      )}

      {!sessionClosed && (
        <div className="mt-7 flex flex-wrap gap-3">
          {weak.length > 0 && (
            <button
              onClick={onPracticeWeak}
              className="rounded-sm px-4 py-2 font-utility text-xs uppercase tracking-widest"
              style={{ background: "var(--chalk)", color: "var(--board)" }}
            >
              Practice weak areas
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-sm px-4 py-2 font-utility text-xs uppercase tracking-widest border"
            style={{ borderColor: "var(--chalk-rule)", color: "var(--chalk)" }}
          >
            {weak.length > 0 || canOfferMore ? "I'm done for now" : "Finish"}
          </button>
        </div>
      )}
    </div>
  );
}