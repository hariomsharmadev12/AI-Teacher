"use client";

import { useEffect, useRef, useState } from "react";
import type { LearnerLevel, LessonPlan, LessonRequest, LessonSection } from "@/lib/types";
import VideoLecture from "./VideoLecture";
import LessonSummary from "./LessonSummary";

type Phase = "explain" | "question" | "evaluating" | "feedback" | "complete";
type Verdict = "correct" | "partial" | "wrong";

interface SectionResult {
  verdict: Verdict;
  misconception: string | null;
  reExplanation: string | null;
}

interface SectionOutcome {
  title: string;
  verdict: Verdict;
}

const RETRY_LIMIT = 2; // after this many wrong attempts, allow moving on anyway
const TIME_CHECK_INTERVAL_MS = 15000; // how often the "time left" display refreshes
const MIN_MINUTES_TO_OFFER_MORE = 2; // don't bother offering more topics for scraps of time

export default function AdaptiveLessonPlayer({
  plan,
  level,
  timeBudgetMinutes,
  request,
  sourceContent,
}: {
  plan: LessonPlan;
  level: LearnerLevel;
  timeBudgetMinutes: number;
  request: LessonRequest;
  // Extracted text from the original uploaded file, when the lesson came
  // from a file rather than a typed topic. A browser File object can't be
  // resent once the form has moved on, so the server hands this plain
  // string back on the initial /api/lessons response and we carry it here
  // so "Add more topics" can stay grounded in the same source material.
  sourceContent?: string;
}) {
  // The active list of sections being taught. Normally the full plan, but
  // "Practice weak areas" swaps this to just the sections the learner
  // struggled with, and "Add more topics" appends freshly generated ones.
  const [queue, setQueue] = useState<LessonSection[]>(plan.sections);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("explain");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<SectionResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, SectionOutcome>>({});
  const [sessionClosed, setSessionClosed] = useState(false);

  // Every section title ever taught this session (original plan + any
  // "add more topics" rounds), so we never ask the LLM to repeat itself.
  const [coveredTitles, setCoveredTitles] = useState<string[]>(
    plan.sections.map((s) => s.title)
  );
  const [addingMore, setAddingMore] = useState(false);
  const [addMoreError, setAddMoreError] = useState<string | null>(null);

  const sessionStartRef = useRef(Date.now());
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), TIME_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const section: LessonSection | undefined = queue[sectionIndex];
  const sectionsLeftAfterThis = Math.max(0, queue.length - sectionIndex - 1);
  const elapsedMinutes = (nowTick - sessionStartRef.current) / 60000;
  const minutesLeft = Math.max(0, timeBudgetMinutes - elapsedMinutes);
  const timeIsUp = minutesLeft <= 0.5;
  const canOfferMore = !sessionClosed && minutesLeft >= MIN_MINUTES_TO_OFFER_MORE;

  function recordOutcome() {
    if (section && result) {
      setOutcomes((prev) => ({
        ...prev,
        [section.id]: { title: section.title, verdict: result.verdict },
      }));
    }
  }

  async function submitAnswer() {
    if (!section || !answer.trim()) return;
    setPhase("evaluating");
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionExplanation: section.explanation,
          checkpoint: section.checkpoint,
          learnerAnswer: answer,
          level,
        }),
      });
      if (!res.ok) throw new Error("evaluate failed");
      const data: SectionResult = await res.json();
      setResult(data);
      setAttempts((n) => n + 1);
      setPhase("feedback");
    } catch {
      setError("Couldn't reach the evaluator. Try again.");
      setPhase("question");
    }
  }

  function retry() {
    setAnswer("");
    setResult(null);
    setPhase("question");
  }

  function advance() {
    recordOutcome();
    const next = sectionIndex + 1;
    setAnswer("");
    setResult(null);
    setAttempts(0);
    setError(null);
    setSectionIndex(next);
    setPhase(next < queue.length ? "explain" : "complete");
  }

  function finishNow() {
    recordOutcome();
    setPhase("complete");
  }

  function practiceWeakAreas() {
    const weakIds = Object.entries(outcomes)
      .filter(([, o]) => o.verdict !== "correct")
      .map(([id]) => id);
    const weakSections = plan.sections.filter((s) => weakIds.includes(s.id));
    if (weakSections.length === 0) return;
    setQueue(weakSections);
    setSectionIndex(0);
    setAnswer("");
    setResult(null);
    setAttempts(0);
    setError(null);
    setPhase("explain");
  }

  async function addMoreTopics() {
    setAddingMore(true);
    setAddMoreError(null);
    const resumeIndex = queue.length;
    try {
      const res = await fetch("/api/lessons/more", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: request.source,
          profile: request.profile,
          alreadyCovered: coveredTitles,
          // Only meaningful for file-sourced lessons; undefined is dropped
          // by JSON.stringify for topic-sourced ones, which is fine.
          content: sourceContent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.sections) || data.sections.length === 0) {
        throw new Error(data.message ?? "Couldn't find more topics right now.");
      }
      const newSections: LessonSection[] = data.sections;
      setCoveredTitles((prev) => [...prev, ...newSections.map((s) => s.title)]);
      setQueue((prev) => [...prev, ...newSections]);
      setSectionIndex(resumeIndex);
      setAnswer("");
      setResult(null);
      setAttempts(0);
      setError(null);
      setPhase("explain");
    } catch (err) {
      setAddMoreError(
        err instanceof Error ? err.message : "Couldn't find more topics right now."
      );
    } finally {
      setAddingMore(false);
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-6">
        {queue.map((s, i) => (
          <span
            key={s.id}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                i < sectionIndex || phase === "complete"
                  ? "var(--chalk-sage)"
                  : i === sectionIndex
                  ? "var(--chalk-yellow)"
                  : "var(--chalk-rule)",
            }}
          />
        ))}
      </div>

      <p className="font-utility text-xs uppercase tracking-widest text-chalk-yellow">
        Stage 02 — Adaptive teaching loop
      </p>

      {phase === "complete" || !section ? (
        <LessonSummary
          strong={Object.values(outcomes).filter((o) => o.verdict === "correct")}
          weak={Object.values(outcomes).filter((o) => o.verdict !== "correct")}
          minutesUsed={elapsedMinutes}
          timeBudgetMinutes={timeBudgetMinutes}
          minutesLeft={minutesLeft}
          canOfferMore={canOfferMore}
          addingMore={addingMore}
          addMoreError={addMoreError}
          sessionClosed={sessionClosed}
          onPracticeWeak={practiceWeakAreas}
          onAddMoreTopics={addMoreTopics}
          onClose={() => setSessionClosed(true)}
        />
      ) : (
        <div
          className="mt-3 rounded-sm border px-6 py-6"
          style={{ borderColor: "var(--chalk-rule)", background: "var(--board-panel)" }}
        >
          <div className="flex items-center gap-3">
            <span className="font-utility text-xs text-chalk-yellow">
              {String(sectionIndex + 1).padStart(2, "0")}/
              {String(queue.length).padStart(2, "0")}
            </span>
            <h2 className="font-display text-xl">{section.title}</h2>
          </div>

          <p className="mt-1 font-utility text-[11px] text-chalk-dim">
            {timeIsUp
              ? "You're past your planned study time — wrap up whenever you like."
              : `~${Math.max(1, Math.round(minutesLeft))} min left in your session${
                  sectionsLeftAfterThis > 0
                    ? ` · ${sectionsLeftAfterThis} more topic${
                        sectionsLeftAfterThis === 1 ? "" : "s"
                      } after this`
                    : ""
                }`}
          </p>

          {phase === "explain" && (
            <>
              <VideoLecture key={section.id} script={section.explanation} />

              <details className="mt-3">
                <summary className="cursor-pointer font-utility text-[11px] uppercase tracking-widest text-chalk-dim">
                  Show transcript
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-chalk-dim">
                  {section.explanation}
                </p>
              </details>

              <button
                onClick={() => setPhase("question")}
                className="mt-5 rounded-sm px-4 py-2 font-utility text-xs uppercase tracking-widest"
                style={{ background: "var(--chalk-yellow)", color: "var(--board)" }}
              >
                Ask me
              </button>
            </>
          )}

          {(phase === "question" || phase === "evaluating") && (
            <>
              <p className="mt-4 text-sm font-medium">{section.checkpoint.prompt}</p>

              {section.checkpoint.kind === "mcq" && section.checkpoint.options ? (
                <div className="mt-3 flex flex-col gap-2">
                  {section.checkpoint.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(opt)}
                      disabled={phase === "evaluating"}
                      className="text-left rounded-sm border px-4 py-2 text-sm transition-colors"
                      style={{
                        borderColor:
                          answer === opt ? "var(--chalk-yellow)" : "var(--chalk-rule)",
                        background: answer === opt ? "rgba(232,196,104,0.1)" : "transparent",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={phase === "evaluating"}
                  rows={3}
                  placeholder="Type your answer…"
                  className="mt-3 w-full rounded-sm border px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: "var(--chalk-rule)",
                    background: "transparent",
                    color: "var(--chalk)",
                  }}
                />
              )}

              {error && (
                <p className="mt-2 text-sm" style={{ color: "var(--chalk-coral)" }}>
                  {error}
                </p>
              )}

              <button
                onClick={submitAnswer}
                disabled={!answer.trim() || phase === "evaluating"}
                className="mt-4 rounded-sm px-4 py-2 font-utility text-xs uppercase tracking-widest disabled:opacity-40"
                style={{ background: "var(--chalk)", color: "var(--board)" }}
              >
                {phase === "evaluating" ? "Checking…" : "Submit answer"}
              </button>
            </>
          )}

          {phase === "feedback" && result && (
            <div className="mt-4">
              <p
                className="font-utility text-xs uppercase tracking-widest"
                style={{
                  color:
                    result.verdict === "correct" ? "var(--chalk-sage)" : "var(--chalk-coral)",
                }}
              >
                {result.verdict === "correct"
                  ? "Correct"
                  : result.verdict === "partial"
                  ? "Partially right"
                  : "Not quite"}
              </p>

              {result.misconception && (
                <p className="mt-2 text-sm text-chalk-dim">{result.misconception}</p>
              )}

              {result.reExplanation && (
                <>
                  <VideoLecture
                    key={`${section.id}-retry-${attempts}`}
                    script={result.reExplanation}
                  />
                  <details className="mt-3">
                    <summary className="cursor-pointer font-utility text-[11px] uppercase tracking-widest text-chalk-dim">
                      Show transcript
                    </summary>
                    <p
                      className="mt-2 text-sm leading-relaxed rounded-sm border-l-2 pl-4"
                      style={{ borderColor: "var(--chalk-coral)" }}
                    >
                      {result.reExplanation}
                    </p>
                  </details>
                </>
              )}

              <div className="mt-5 flex gap-3">
                {result.verdict !== "correct" && (
                  <button
                    onClick={retry}
                    className="rounded-sm px-4 py-2 font-utility text-xs uppercase tracking-widest"
                    style={{ background: "var(--chalk-yellow)", color: "var(--board)" }}
                  >
                    Try again
                  </button>
                )}
                {(result.verdict === "correct" || attempts >= RETRY_LIMIT) && (
                  <button
                    onClick={advance}
                    className="rounded-sm px-4 py-2 font-utility text-xs uppercase tracking-widest"
                    style={{ background: "var(--chalk)", color: "var(--board)" }}
                  >
                    {sectionIndex + 1 < queue.length ? "Next section" : "Finish lesson"}
                  </button>
                )}
              </div>
            </div>
          )}

          {phase !== "evaluating" && (
            <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--chalk-rule)" }}>
              <button
                onClick={finishNow}
                className="font-utility text-[11px] uppercase tracking-widest"
                style={{ color: timeIsUp ? "var(--chalk-coral)" : "var(--chalk-dim)" }}
              >
                {timeIsUp ? "Time's up — finish for now →" : "Finish for now"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}