"use client";

import { useEffect, useState } from "react";

// If your D-ID generate/status routes live at different paths, change these two.
const GENERATE_ENDPOINT = "/api/video"; // src/app/api/video/route.ts
const STATUS_ENDPOINT = "/api/video/status"; // src/app/api/video/status/route.ts

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 80; // ~4 minutes of polling before giving up (D-ID trial tier can queue)

// Cache generated video URLs by exact script text. Revisiting the same
// narration — e.g. "Practice weak areas" replaying a section's explanation —
// reuses the already-rendered video instead of spending another D-ID credit
// re-rendering identical content. Cleared on full page reload.
const videoCache = new Map<string, string>();

export type DidVideoState = "idle" | "generating" | "processing" | "ready" | "error";

interface UseDidVideoResult {
  state: DidVideoState;
  videoUrl: string | null;
  error: string | null;
  elapsedSeconds: number;
}

/**
 * Given a narration script, kicks off a D-ID talking-head video and polls
 * until it's ready. Re-runs automatically whenever `script` changes (e.g. a
 * new lesson section, or a new re-explanation after a wrong answer).
 */
export function useDidVideo(script: string | null | undefined): UseDidVideoResult {
  const [state, setState] = useState<DidVideoState>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Scoped to THIS effect invocation only. Using a ref shared across
    // remounts (e.g. React Strict Mode's dev-only double-invoke) let a
    // second run reset a first run's "cancelled" flag back to false,
    // leaving two generate+poll loops racing each other. A local variable
    // is captured per-closure, so each run can only ever cancel itself.
    let cancelled = false;

    setVideoUrl(null);
    setError(null);
    setElapsedSeconds(0);

    if (!script) {
      setState("idle");
      return;
    }

    const cached = videoCache.get(script);
    if (cached) {
      setVideoUrl(cached);
      setState("ready");
      return;
    }

    setState("generating");

    async function run() {
      try {
        const genRes = await fetch(GENERATE_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: script }),
        });
        const genData = await genRes.json();
        if (!genRes.ok || !genData.videoId) {
          throw new Error(genData.message ?? "Video generation failed to start.");
        }
        if (cancelled) return;
        setState("processing");

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
          if (cancelled) return;
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          if (cancelled) return;
          setElapsedSeconds((s) => s + Math.round(POLL_INTERVAL_MS / 1000));

          const statusRes = await fetch(`${STATUS_ENDPOINT}?id=${genData.videoId}`);
          const statusData = await statusRes.json();
          if (!statusRes.ok) {
            throw new Error(statusData.message ?? "Couldn't check video status.");
          }

          if (statusData.status === "done" && statusData.result_url) {
            videoCache.set(script, statusData.result_url);
            if (!cancelled) {
              setVideoUrl(statusData.result_url);
              setState("ready");
            }
            return;
          }
          if (statusData.status === "error") {
            throw new Error("The video renderer reported an error.");
          }
          // "created" / "started" — keep polling
        }
        throw new Error("Video took too long to render.");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Video generation failed.");
          setState("error");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [script]);

  return { state, videoUrl, error, elapsedSeconds };
}