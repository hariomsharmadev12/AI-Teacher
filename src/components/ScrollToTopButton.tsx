"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeContext";

export default function ScrollToTopButton() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={`fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-200 ${
        isDark
          ? "border-white/10 bg-zinc-900/90 text-zinc-300 hover:border-indigo-500/50 hover:text-white"
          : "border-zinc-200 bg-white/90 text-zinc-500 hover:border-indigo-400 hover:text-zinc-900"
      } ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}