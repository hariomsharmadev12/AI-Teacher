// Shared domain types for the AI Teacher pipeline.
// Each pipeline stage (see /mnt/skills or PROJECT_PLAN.md) reads/writes these.

export type LearnerLevel = "beginner" | "intermediate" | "advanced";

export type SupportedLanguage = "en" | "hi";

export interface LearnerProfile {
  level: LearnerLevel;
  timeMinutes: number; // total time the learner wants to spend
  language: SupportedLanguage;
  goal?: string; // optional free-text goal, e.g. "prep for unit test"
}

export interface LessonSource {
  kind: "topic" | "file";
  topic?: string; // present when kind === "topic"
  fileName?: string; // present when kind === "file"
  fileId?: string; // storage reference, set after upload
}

export interface LessonRequest {
  source: LessonSource;
  profile: LearnerProfile;
}

// --- Stage 2 output: LLM lesson planner (Part 2 of the build) ---

export interface CheckpointQuestion {
  id: string;
  prompt: string;
  kind: "mcq" | "short_answer";
  options?: string[]; // for mcq
  correctAnswer: string;
  commonMisconceptions?: { answer: string; explanation: string }[];
}

export interface LessonSection {
  id: string;
  title: string;
  depth: "brief" | "standard" | "deep";
  explanation: string; // narration script for this section
  visualType: "diagram" | "equation" | "none";
  checkpoint: CheckpointQuestion;
}

export interface LessonPlan {
  id: string;
  title: string;
  language: SupportedLanguage;
  estimatedMinutes: number;
  sections: LessonSection[];
}
