"use client";

import TeachingLoopDiagram from "@/components/TeachingLoopDiagram";
import LessonIntakeForm from "@/components/LessonIntakeForm";
import ThemeToggle from "@/components/ThemeToggle";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import { useTheme } from "@/components/ThemeContext";

const PIPELINE_STAGES = [
  { id: "01", label: "Upload or topic", status: "active" as const },
  { id: "02", label: "Parse & RAG retrieve", status: "active" as const },
  { id: "03", label: "LLM lesson planner", status: "active" as const },
  { id: "04", label: "Voice, avatar & visuals", status: "active" as const },
  { id: "05", label: "Assembled lesson video", status: "active" as const },
];

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`relative z-10 flex min-h-screen flex-col transition-colors ${
        isDark ? "bg-zinc-950 text-zinc-50" : "bg-white text-zinc-900"
      }`}
    >
      <header
        className={`border-b backdrop-blur-md ${
          isDark ? "border-white/10 bg-black/50" : "border-zinc-200 bg-white/70"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
            AI Teacher
          </span>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${
                isDark
                  ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
                  : "border-indigo-200 bg-indigo-50 text-indigo-600"
              }`}
            >
              GEMINI FLASH MODEL
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-24 px-6 py-20">
        {/* Hero Section */}
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div className="space-y-8">
            <div
              className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium ${
                isDark
                  ? "border-zinc-800 bg-zinc-900/50 text-zinc-300"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600"
              }`}
            >
              <span className="mr-2 flex h-2 w-2 animate-pulse rounded-full bg-indigo-500"></span>
              50% of the score is the teacher brain
            </div>
            <h1
              className={`bg-gradient-to-r bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl ${
                isDark ? "from-white to-zinc-500" : "from-zinc-900 to-zinc-400"
              }`}
            >
              Six stages. <br />
              One believable teacher.
            </h1>
            <p className={`max-w-lg text-lg leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              Not a script with a face on it. Give it a topic or a document, and
              it plans the lesson, explains it, checks understanding, and
              re-explains the parts that didn&rsquo;t land — before it ever renders a frame.
            </p>
            <div
              className={`rounded-xl border p-6 shadow-2xl ${
                isDark ? "border-white/5 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <TeachingLoopDiagram />
            </div>
          </div>

          {/* Form Container */}
          <div
            className={`relative rounded-2xl border p-8 shadow-2xl backdrop-blur-sm ${
              isDark ? "border-white/10 bg-zinc-900/40" : "border-zinc-200 bg-white"
            }`}
          >
            <div
              className={`absolute -inset-0.5 -z-10 rounded-2xl bg-gradient-to-b opacity-50 blur-xl ${
                isDark ? "from-indigo-500/20 to-transparent" : "from-indigo-200/40 to-transparent"
              }`}
            ></div>
            <LessonIntakeForm />
          </div>
        </div>

        {/* Pipeline Stage Tracker */}
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Content Generation Pipeline
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.id}
                className={`relative overflow-hidden rounded-xl border p-5 transition-all ${
                  stage.status === "active"
                    ? isDark
                      ? "border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                      : "border-indigo-300 bg-indigo-50 shadow-[0_0_15px_rgba(99,102,241,0.08)]"
                    : isDark
                      ? "border-zinc-800 bg-zinc-900/20"
                      : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      stage.status === "active"
                        ? "text-indigo-500"
                        : isDark
                          ? "text-zinc-600"
                          : "text-zinc-400"
                    }`}
                  >
                    STEP {stage.id}
                  </span>
                  {stage.status === "active" && (
                    <span className="flex h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></span>
                  )}
                </div>
                <p
                  className={`text-sm font-medium ${
                    stage.status === "active"
                      ? isDark
                        ? "text-white"
                        : "text-zinc-900"
                      : isDark
                        ? "text-zinc-500"
                        : "text-zinc-500"
                  }`}
                >
                  {stage.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className={`border-t px-6 py-8 text-center ${isDark ? "border-white/10" : "border-zinc-200"}`}>
        <p className={`text-xs tracking-wide ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
          AI Teacher is a project by Hariom Sharma
        </p>
      </footer>

      <ScrollToTopButton />
    </div>
  );
}