"use client";

import { useDidVideo } from "@/lib/hooks/useDidVideo";

export default function VideoLecture({ script }: { script: string }) {
  const { state, videoUrl, error, elapsedSeconds } = useDidVideo(script);

  if (state === "ready" && videoUrl) {
    return (
      <video
        key={videoUrl}
        src={videoUrl}
        controls
        autoPlay
        playsInline
        className="mt-4 w-full rounded-sm border"
        style={{ borderColor: "var(--chalk-rule)", background: "black" }}
      />
    );
  }

  if (state === "error") {
    return (
      <div
        className="mt-4 rounded-sm border px-4 py-4"
        style={{ borderColor: "var(--chalk-coral)" }}
      >
        <p className="text-sm" style={{ color: "var(--chalk-coral)" }}>
          Couldn&rsquo;t generate the lecture video ({error}). Here&rsquo;s the script instead:
        </p>
        <p className="mt-2 text-sm leading-relaxed text-chalk-dim">{script}</p>
      </div>
    );
  }

  return (
    <div
      className="mt-4 flex items-center gap-3 rounded-sm border px-4 py-8"
      style={{ borderColor: "var(--chalk-rule)", background: "var(--board-panel)" }}
    >
      <span
        className="h-2 w-2 shrink-0 animate-pulse rounded-full"
        style={{ background: "var(--chalk-yellow)" }}
        aria-hidden
      />
      <p className="font-utility text-xs uppercase tracking-widest text-chalk-dim">
        {state === "generating"
          ? "Starting the teacher\u2026"
          : `Rendering the lecture video\u2026 (${elapsedSeconds}s)`}
      </p>
    </div>
  );
}