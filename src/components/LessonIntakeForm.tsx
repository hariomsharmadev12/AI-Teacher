"use client";

import { useState, type FormEvent } from "react";
import type { LearnerLevel, LessonPlan, LessonRequest, SupportedLanguage } from "@/lib/types";
import AdaptiveLessonPlayer from "./AdaptiveLessonPlayer";
import PlanningIndicator from "./PlanningIndicator";

type SourceKind = "topic" | "file";
type Status = "idle" | "submitting" | "done" | "error";

const LEVELS: { value: LearnerLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
];

export default function LessonIntakeForm() {
  const [sourceKind, setSourceKind] = useState<SourceKind>("topic");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<LearnerLevel>("beginner");
  const [timeMinutes, setTimeMinutes] = useState(20);
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lessonRequest, setLessonRequest] = useState<LessonRequest | null>(null);
  // Extracted text of the uploaded file, returned by /api/lessons for
  // file-sourced lessons. Carried down to AdaptiveLessonPlayer so "Add
  // more topics" can stay grounded in the same document later — the
  // original File object can't be resent once we're past this form.
  const [sourceContent, setSourceContent] = useState<string | undefined>(undefined);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setResultMessage(null);
    setLessonPlan(null);
    setLessonRequest(null);
    setSourceContent(undefined);

    const form = new FormData();
    form.set("sourceKind", sourceKind);
    if (sourceKind === "topic") form.set("topic", topic);
    if (sourceKind === "file" && file) form.set("file", file);
    form.set("level", level);
    form.set("timeMinutes", String(timeMinutes));
    form.set("language", language);
    if (goal) form.set("goal", goal);

    try {
      const res = await fetch("/api/lessons", { method: "POST", body: form });
      const data = await res.json();
      setStatus(res.ok ? "done" : "error");
      setResultMessage(data.message ?? "Request received.");
      if (data.lessonPlan) setLessonPlan(data.lessonPlan as LessonPlan);
      if (data.request) setLessonRequest(data.request as LessonRequest);
      if (typeof data.sourceContent === "string") setSourceContent(data.sourceContent);
    } catch {
      setStatus("error");
      setResultMessage("Couldn't reach the lesson planner. Try again.");
    }
  }

  const canSubmit =
    (sourceKind === "topic" ? topic.trim().length > 0 : file !== null) &&
    status !== "submitting";

  return (
    <div>
      <div className="relative rotate-[-0.6deg]">
        {/* pin */}
        <div
          className="absolute -top-3 left-8 h-4 w-4 rounded-full shadow-md"
          style={{ background: "var(--chalk-coral)" }}
          aria-hidden
        />
        <form
          onSubmit={handleSubmit}
          className="rounded-sm shadow-2xl px-7 py-8 sm:px-9 sm:py-9"
          style={{ background: "var(--chalk)", color: "var(--board)" }}
        >
          <p className="font-utility text-xs tracking-widest uppercase opacity-60">
            Stage 01 — Upload or topic
          </p>
          <h2 className="font-display text-2xl mt-1 mb-6">Draft a lesson</h2>

          {/* source toggle */}
          <div className="flex gap-2 mb-5" role="tablist" aria-label="Lesson source">
            {(["topic", "file"] as SourceKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={sourceKind === kind}
                onClick={() => setSourceKind(kind)}
                className={`font-utility text-xs uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
                  sourceKind === kind
                    ? "border-transparent"
                    : "border-black/20 opacity-60 hover:opacity-100"
                }`}
                style={
                  sourceKind === kind
                    ? { background: "var(--board)", color: "var(--chalk)" }
                    : undefined
                }
              >
                {kind === "topic" ? "Type a topic" : "Upload material"}
              </button>
            ))}
          </div>

          {sourceKind === "topic" ? (
            <label className="block mb-5">
              <span className="text-sm font-medium">What should the lesson cover?</span>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Teach me Chapter 4: Ohm's Law, in 20 minutes"
                rows={3}
                className="mt-1.5 w-full rounded border border-black/15 bg-white/60 px-3 py-2 text-sm outline-none focus:border-black/40 focus-visible:ring-2 focus-visible:ring-black/30"
                required
              />
            </label>
          ) : (
            <label className="block mb-5">
              <span className="text-sm font-medium">Upload a document</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1.5 w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-wide file:cursor-pointer"
                style={{ colorScheme: "light" }}
                required
              />
              <span className="mt-1 block text-xs opacity-60">PDF, DOCX, or PPTX</span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-4 mb-5">
            <label className="block">
              <span className="text-sm font-medium">Level</span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LearnerLevel)}
                className="mt-1.5 w-full rounded border border-black/15 bg-white/60 px-3 py-2 text-sm outline-none focus:border-black/40"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="mt-1.5 w-full rounded border border-black/15 bg-white/60 px-3 py-2 text-sm outline-none focus:border-black/40"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block mb-5">
            <span className="text-sm font-medium">
              Time available <span className="font-utility opacity-60">{timeMinutes} min</span>
            </span>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(Number(e.target.value))}
              className="mt-2 w-full accent-black"
            />
          </label>

          <label className="block mb-7">
            <span className="text-sm font-medium">
              Goal <span className="opacity-50 font-normal">(optional)</span>
            </span>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. prep for Friday's unit test"
              className="mt-1.5 w-full rounded border border-black/15 bg-white/60 px-3 py-2 text-sm outline-none focus:border-black/40"
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-sm py-2.5 font-utility text-xs uppercase tracking-widest transition-opacity disabled:opacity-40"
            style={{ background: "var(--board)", color: "var(--chalk)" }}
          >
            {status === "submitting" && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {status === "submitting" ? "Planning the lesson…" : "Draft the lesson"}
          </button>

          {status === "submitting" && <PlanningIndicator variant={sourceKind} />}

          {resultMessage && (
            <p
              className="mt-4 text-sm rounded px-3 py-2"
              style={{
                background:
                  status === "error" ? "rgba(216,90,60,0.12)" : "rgba(60,120,90,0.12)",
              }}
            >
              {resultMessage}
            </p>
          )}
        </form>
      </div>

      {lessonPlan && lessonRequest && (
        <AdaptiveLessonPlayer
          plan={lessonPlan}
          level={level}
          timeBudgetMinutes={timeMinutes}
          request={lessonRequest}
          sourceContent={sourceContent}
        />
      )}
    </div>
  );
}