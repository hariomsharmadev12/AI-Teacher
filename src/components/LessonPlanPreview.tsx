import type { LessonPlan } from "@/lib/types";

export default function LessonPlanPreview({ plan }: { plan: LessonPlan }) {
  return (
    <div className="mt-10">
      <div
        className="flex items-baseline justify-between gap-4 border-b pb-3"
        style={{ borderColor: "var(--chalk-rule)" }}
      >
        <div>
          <p className="font-utility text-xs uppercase tracking-widest text-chalk-yellow">
            Stage 03 — Lesson plan
          </p>
          <h2 className="font-display text-2xl mt-1">{plan.title}</h2>
        </div>
        <span className="font-utility text-xs text-chalk-dim whitespace-nowrap">
          ~{plan.estimatedMinutes} min · {plan.language === "hi" ? "Hindi" : "English"}
        </span>
      </div>

      <ol className="mt-6 flex flex-col gap-4">
        {plan.sections.map((section, i) => (
          <li
            key={section.id}
            className="rounded-sm border px-5 py-5"
            style={{ borderColor: "var(--chalk-rule)", background: "var(--board-panel)" }}
          >
            <div className="flex items-center gap-3">
              <span className="font-utility text-xs text-chalk-yellow">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-lg">{section.title}</h3>
              <span
                className="ml-auto font-utility text-[10px] uppercase tracking-wide text-chalk-dim border rounded-full px-2 py-0.5"
                style={{ borderColor: "var(--chalk-rule)" }}
              >
                {section.depth}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-chalk-dim">{section.explanation}</p>

            <div
              className="mt-4 rounded-sm border-l-2 pl-4"
              style={{ borderColor: "var(--chalk-coral)" }}
            >
              <p className="text-sm font-medium">{section.checkpoint.prompt}</p>

              {section.checkpoint.options && (
                <ul className="mt-2 flex flex-col gap-1">
                  {section.checkpoint.options.map((opt) => (
                    <li
                      key={opt}
                      className="text-sm"
                      style={{
                        color:
                          opt === section.checkpoint.correctAnswer
                            ? "var(--chalk-sage)"
                            : "var(--chalk-dim)",
                      }}
                    >
                      {opt === section.checkpoint.correctAnswer ? "✓ " : "— "}
                      {opt}
                    </li>
                  ))}
                </ul>
              )}

              {section.checkpoint.commonMisconceptions?.map((m) => (
                <p key={m.answer} className="mt-2 font-utility text-xs text-chalk-dim">
                  If &ldquo;{m.answer}&rdquo;: {m.explanation}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
