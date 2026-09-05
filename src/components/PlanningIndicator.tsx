"use client";

import { useEffect, useState } from "react";

const TOPIC_MESSAGES = [
  "Thinking through the topic…",
  "Mapping the six teaching stages…",
  "Writing explanations for each section…",
  "Drafting checkpoint questions…",
  "Proofreading the lesson plan…",
];

const FILE_MESSAGES = [
  "Reading through your document…",
  "Pulling out the key ideas…",
  "Mapping the six teaching stages…",
  "Writing explanations for each section…",
  "Drafting checkpoint questions…",
];

const MESSAGE_INTERVAL_MS = 2200;
const FADE_MS = 200;

export default function PlanningIndicator({ variant }: { variant: "topic" | "file" }) {
  const messages = variant === "file" ? FILE_MESSAGES : TOPIC_MESSAGES;
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  // Resets to the first message whenever the source type changes, so a
  // stale "Pulling out the key ideas…" doesn't linger after switching
  // from file to topic mode between submissions.
  useEffect(() => {
    setIndex(0);
    setFading(false);
  }, [variant]);

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      const clear = setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setFading(false);
      }, FADE_MS);
      return () => clearTimeout(clear);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [messages]);

  return (
    <div
      className="mt-4 flex items-center gap-3 rounded-sm px-3 py-2.5"
      style={{ background: "rgba(0,0,0,0.06)" }}
      role="status"
      aria-live="polite"
    >
      <span className="flex shrink-0 gap-1">
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]"
          style={{ background: "var(--chalk-coral)" }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]"
          style={{ background: "var(--chalk-coral)" }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full"
          style={{ background: "var(--chalk-coral)" }}
        />
      </span>
      <p
        className={`text-sm transition-opacity duration-200 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {messages[index]}
      </p>
    </div>
  );
}