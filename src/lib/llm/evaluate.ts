import type { CheckpointQuestion, LearnerLevel } from "@/lib/types";
import { callClaudeForJSON } from "./client";

export type Verdict = "correct" | "partial" | "wrong";

export interface Evaluation {
  verdict: Verdict;
  misconception: string | null; // null when correct
  reExplanation: string | null; // a short, differently-angled explanation; null when correct
}

interface RawEvaluation {
  verdict: Verdict;
  misconception: string; // Updated: Gemini needs this to be strictly a string in the schema
  reExplanation: string; // Updated: Gemini needs this to be strictly a string in the schema
}

const EVALUATION_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["correct", "partial", "wrong"] },
    misconception: {
      type: "string",
      description:
        "The specific misunderstanding this answer reveals, in plain terms. Return an empty string if verdict is correct.",
    },
    reExplanation: {
      type: "string",
      description:
        "A short spoken re-explanation using a DIFFERENT analogy than the original, aimed directly at the misconception. Return an empty string if verdict is correct.",
    },
  },
  required: ["verdict", "misconception", "reExplanation"],
} as const;

function systemPrompt(): string {
  return `You are the evaluation module of an AI teacher. You just asked a learner a
checkpoint question after explaining a concept. Diagnose their answer.

Rules:
- "correct" only if the answer demonstrates real understanding, not just a
  lucky keyword match.
- "partial" if the answer is on the right track but incomplete or slightly
  imprecise.
- "wrong" if it reflects a real misunderstanding, even if confidently
  stated.
- Identify the SPECIFIC misconception behind a wrong or partial answer.
- If wrong or partial, write a short re-explanation (2-4 sentences, spoken
  style) that attacks that specific misconception using a different angle
  or analogy than the original explanation.
- If the verdict is "correct", return an empty string ("") for both misconception and reExplanation.
- Match the learner's level and the question's language in your re-explanation.
- Respond with only the JSON object described by the schema — no preamble.`;
}

function userPrompt(args: {
  sectionExplanation: string;
  checkpoint: CheckpointQuestion;
  learnerAnswer: string;
  level: LearnerLevel;
}): string {
  const { sectionExplanation, checkpoint, learnerAnswer, level } = args;
  return [
    `Original explanation given to the learner:\n${sectionExplanation}`,
    "",
    `Checkpoint question: ${checkpoint.prompt}`,
    checkpoint.options ? `Options: ${checkpoint.options.join(" | ")}` : null,
    `Correct answer: ${checkpoint.correctAnswer}`,
    checkpoint.commonMisconceptions?.length
      ? `Known misconceptions for this question:\n${checkpoint.commonMisconceptions
          .map((m) => `- "${m.answer}": ${m.explanation}`)
          .join("\n")}`
      : null,
    "",
    `Learner level: ${level}`,
    `Learner's answer: ${learnerAnswer}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export async function evaluateAnswer(args: {
  sectionExplanation: string;
  checkpoint: CheckpointQuestion;
  learnerAnswer: string;
  level: LearnerLevel;
}): Promise<Evaluation> {
  // Cheap short-circuit for MCQ exact match
  if (
    args.checkpoint.kind === "mcq" &&
    args.learnerAnswer.trim() === args.checkpoint.correctAnswer.trim()
  ) {
    return { verdict: "correct", misconception: null, reExplanation: null };
  }

  const raw = await callClaudeForJSON<RawEvaluation>({
    system: systemPrompt(),
    user: userPrompt(args),
    schema: EVALUATION_SCHEMA,
  });

  // Map the empty strings returned by Gemini back to null for the frontend
  return {
    verdict: raw.verdict,
    misconception: raw.misconception === "" ? null : raw.misconception,
    reExplanation: raw.reExplanation === "" ? null : raw.reExplanation,
  };
}