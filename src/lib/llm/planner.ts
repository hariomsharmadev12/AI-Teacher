import { randomUUID } from "crypto";
import type { LessonPlan, LessonRequest, LessonSection } from "@/lib/types";
import { callClaudeForJSON } from "./client";

// Shape the LLM returns. No ids here — those are assigned after parsing so
// the model isn't asked to invent stable-looking unique strings.
interface RawCheckpoint {
  prompt: string;
  kind: "mcq" | "short_answer";
  options?: string[];
  correctAnswer: string;
  commonMisconceptions?: { answer: string; explanation: string }[];
}
interface RawSection {
  title: string;
  depth: "brief" | "standard" | "deep";
  explanation: string;
  visualType: "diagram" | "equation" | "none";
  checkpoint: RawCheckpoint;
}
interface RawLessonPlan {
  title: string;
  estimatedMinutes: number;
  sections: RawSection[];
}
interface RawMoreSections {
  sections: RawSection[];
}

const CHECKPOINT_SCHEMA = {
  type: "object",
  properties: {
    prompt: { type: "string" },
    kind: { type: "string", enum: ["mcq", "short_answer"] },
    options: {
      type: "array",
      items: { type: "string" },
      description: "3-4 options, present only when kind is mcq.",
    },
    correctAnswer: { type: "string" },
    commonMisconceptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          answer: { type: "string" },
          explanation: {
            type: "string",
            description:
              "Why a learner would give this specific wrong answer, and what misconception it reveals.",
          },
        },
        required: ["answer", "explanation"],
      },
    },
  },
  required: ["prompt", "kind", "correctAnswer"],
} as const;

const SECTION_ITEM_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    depth: { type: "string", enum: ["brief", "standard", "deep"] },
    explanation: {
      type: "string",
      description:
        "The narration script for this section: what the teacher says out loud, written for the target language and learner level. Not bullet points.",
    },
    visualType: { type: "string", enum: ["diagram", "equation", "none"] },
    checkpoint: CHECKPOINT_SCHEMA,
  },
  required: ["title", "depth", "explanation", "visualType", "checkpoint"],
} as const;

const LESSON_PLAN_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    estimatedMinutes: { type: "number" },
    sections: {
      type: "array",
      minItems: 2,
      maxItems: 12,
      items: SECTION_ITEM_SCHEMA,
    },
  },
  required: ["title", "estimatedMinutes", "sections"],
} as const;

const MORE_SECTIONS_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: SECTION_ITEM_SCHEMA,
    },
  },
  required: ["sections"],
} as const;

function systemPrompt(): string {
  return `You are the lesson-planning module of an AI teacher. You turn a topic (or
supplied source material) and a learner profile into a structured plan for
a narrated lesson.

CRITICAL FORMAT RULES:
- Keep all multiple-choice options concise, clear, and strictly under 15 words each. Do NOT append repetitive filler text or explanation phrases inside option strings.
- Write every "explanation" as a spoken narration script — what a teacher would actually say out loud — not headings or bullet points.
- Match the learner's level: beginner explanations build from first principles with a concrete analogy; advanced explanations move faster and use precise terminology without re-deriving basics.
- COVERAGE COMES FIRST. Decompose the topic into every major subtopic a learner genuinely needs in order to understand it, and give each one its own section. Never drop or merge subtopics just to make the lesson shorter — a lesson that leaves out a core piece of the topic has failed its job even if it fits the requested time neatly.
- Use the time budget to control DEPTH and PACE, not coverage. For a short time budget, keep each section's narration tighter and lean on "brief" depth more often so the full set of subtopics still fits. For a longer time budget, go deeper per section ("deep" depth) while still covering that same full set of subtopics — do not pad by adding filler sections, and do not cut real subtopics to hit the clock.
- Use as many sections as the topic genuinely requires, up to the schema's maximum of 12. A broad topic (e.g. "Python fundamentals") needs noticeably more sections than a narrow one (e.g. "what a for-loop does").
- Every checkpoint question must test understanding of the section that precedes it, not bare recall.
- For MCQ checkpoints, at least one wrong option must correspond to a specific, realistic misconception a learner would hold — not a random distractor. Explain that reasoning in commonMisconceptions, e.g. why a learner would think "current increases" when resistance increases.
- Write all learner-facing text (explanation, checkpoint prompt, options) in the requested language.
- Respond with only the JSON object described by the schema — no preamble.`;
}

function userPrompt(request: LessonRequest, content?: string): string {
  const { source, profile } = request;
  const languageName = profile.language === "hi" ? "Hindi" : "English";
  const topicLine =
    source.kind === "topic"
      ? `Topic: ${source.topic}`
      : `Source material (from "${source.fileName}"):\n${content ?? "(no extracted content available)"}`;

  return [
    topicLine,
    "",
    `Learner level: ${profile.level}`,
    `Time budget: ${profile.timeMinutes} minutes total — use this to set pace and depth per section, not to cut subtopics.`,
    `Language: ${languageName}`,
    profile.goal ? `Learner's stated goal: ${profile.goal}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function moreSectionsSystemPrompt(): string {
  return `You are the lesson-planning module of an AI teacher. The learner already
finished a lesson on this topic and has asked for more — they still have
time and want to keep going on the same subject.

CRITICAL FORMAT RULES:
- Propose 2-5 NEW sections that extend the topic: either deeper aspects of what's
  already been covered, or closely related subtopics a learner would naturally
  study next under the same subject.
- Do not repeat, rename, or lightly rephrase anything in the "already covered" list —
  each new section must teach something genuinely not covered yet.
- Follow the same formatting rules as a normal lesson plan: write "explanation" as a
  spoken narration script (not bullet points), match the learner's level, and give
  each section one checkpoint question with realistic MCQ misconceptions where relevant.
- Write all learner-facing text in the requested language.
- Respond with only the JSON object described by the schema — no preamble.`;
}

function moreSectionsUserPrompt(
  request: LessonRequest,
  alreadyCovered: string[],
  content?: string
): string {
  const { source, profile } = request;
  const languageName = profile.language === "hi" ? "Hindi" : "English";
  const topicLine =
    source.kind === "topic"
      ? `Topic: ${source.topic}`
      : `Source material (from "${source.fileName}"):\n${content ?? "(no extracted content available)"}`;

  return [
    topicLine,
    "",
    `Learner level: ${profile.level}`,
    `Language: ${languageName}`,
    profile.goal ? `Learner's stated goal: ${profile.goal}` : null,
    "",
    `Sections already covered (do NOT repeat or rephrase these):`,
    alreadyCovered.map((title) => `- ${title}`).join("\n"),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function toLessonSection(section: RawSection): LessonSection {
  return {
    id: randomUUID(),
    title: section.title,
    depth: section.depth,
    explanation: section.explanation,
    visualType: section.visualType,
    checkpoint: {
      id: randomUUID(),
      prompt: section.checkpoint.prompt,
      kind: section.checkpoint.kind,
      options: section.checkpoint.options,
      correctAnswer: section.checkpoint.correctAnswer,
      commonMisconceptions: section.checkpoint.commonMisconceptions,
    },
  };
}

export async function generateLessonPlan(
  request: LessonRequest,
  content?: string
): Promise<LessonPlan> {
  const raw = await callClaudeForJSON<RawLessonPlan>({
    system: systemPrompt(),
    user: userPrompt(request, content),
    schema: LESSON_PLAN_SCHEMA,
    maxTokens: 8192,
  });

  return {
    id: randomUUID(),
    title: raw.title,
    language: request.profile.language,
    estimatedMinutes: raw.estimatedMinutes,
    sections: raw.sections.map(toLessonSection),
  };
}

/**
 * Generates additional sections continuing an already-completed lesson,
 * for when the learner has time left and wants to keep studying the same
 * topic. Does not return a full LessonPlan — just the new sections to
 * append to the existing one.
 */
export async function generateMoreSections(
  request: LessonRequest,
  alreadyCovered: string[],
  content?: string
): Promise<LessonSection[]> {
  const raw = await callClaudeForJSON<RawMoreSections>({
    system: moreSectionsSystemPrompt(),
    user: moreSectionsUserPrompt(request, alreadyCovered, content),
    schema: MORE_SECTIONS_SCHEMA,
    maxTokens: 4096,
  });

  return raw.sections.map(toLessonSection);
}