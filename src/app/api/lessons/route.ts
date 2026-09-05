import { NextRequest, NextResponse } from "next/server";
import type { LearnerLevel, LessonPlan, LessonRequest, SupportedLanguage } from "@/lib/types";
import { generateLessonPlan } from "@/lib/llm/planner";
import { LLMConfigError, LLMRequestError } from "@/lib/llm/client";
import { extractTextFromFile, UnsupportedFileTypeError } from "@/lib/files/extractText";

// pdf-parse and mammoth use Node APIs (Buffer, fs) that aren't available
// on the Edge runtime, so this route must run on Node.
export const runtime = "nodejs";

// Keep the grounding text within a sane size — a large PDF could otherwise
// blow past the model's context budget or run up token cost for little
// extra benefit. Trimmed rather than rejected, so long documents still work.
const MAX_CONTENT_CHARS = 40_000;

async function planLesson(
  request: LessonRequest,
  content: string | undefined,
  extra: Record<string, unknown> = {}
) {
  try {
    const lessonPlan: LessonPlan = await generateLessonPlan(request, content);
    return NextResponse.json({
      message: `Lesson plan ready: "${lessonPlan.title}" — ${lessonPlan.sections.length} sections, ~${lessonPlan.estimatedMinutes} min.`,
      request,
      lessonPlan,
      ...extra,
    });
  } catch (err) {
    if (err instanceof LLMConfigError) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    }
    if (err instanceof LLMRequestError) {
      console.error("Lesson planner failed:", err.status, err.body);
      return NextResponse.json(
        {
          message:
            "The Gemini Model is busy - please try again.",
        },
        { status: 502 }
      );
    }
    console.error("Unexpected lesson planner error:", err);
    return NextResponse.json(
      { message: "Unexpected error generating the lesson." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const sourceKind = form.get("sourceKind");
  const topic = form.get("topic");
  const file = form.get("file");
  const level = form.get("level") as LearnerLevel | null;
  const timeMinutes = form.get("timeMinutes");
  const language = form.get("language") as SupportedLanguage | null;
  const goal = form.get("goal");

  if (sourceKind !== "topic" && sourceKind !== "file") {
    return NextResponse.json({ message: "Missing lesson source." }, { status: 400 });
  }
  if (sourceKind === "topic" && !topic) {
    return NextResponse.json({ message: "Topic can't be empty." }, { status: 400 });
  }
  if (sourceKind === "file" && !(file instanceof File)) {
    return NextResponse.json({ message: "No file received." }, { status: 400 });
  }
  if (!level || !language) {
    return NextResponse.json({ message: "Missing learner profile." }, { status: 400 });
  }

  const request: LessonRequest = {
    source:
      sourceKind === "topic"
        ? { kind: "topic", topic: String(topic) }
        : { kind: "file", fileName: (file as File).name },
    profile: {
      level,
      language,
      timeMinutes: Number(timeMinutes ?? 20),
      goal: goal ? String(goal) : undefined,
    },
  };

  if (request.source.kind === "file") {
    let extractedText: string;
    try {
      extractedText = await extractTextFromFile(file as File);
    } catch (err) {
      if (err instanceof UnsupportedFileTypeError) {
        return NextResponse.json({ message: err.message, request }, { status: 400 });
      }
      console.error("File extraction failed:", err);
      return NextResponse.json(
        {
          message: `Couldn't read "${request.source.fileName}". Try a different file.`,
          request,
        },
        { status: 422 }
      );
    }

    const trimmed = extractedText.trim();
    if (!trimmed) {
      return NextResponse.json(
        {
          message: `"${request.source.fileName}" doesn't have any extractable text — it may be a scanned or image-only document.`,
          request,
        },
        { status: 422 }
      );
    }

    const truncated = trimmed.length > MAX_CONTENT_CHARS;
    const content = truncated ? trimmed.slice(0, MAX_CONTENT_CHARS) : trimmed;

    // sourceContent is returned so the client can resend it later if the
    // learner asks for more sections — a browser File object can't be
    // resent after the initial submit, but this plain string can.
    return planLesson(request, content, {
      sourceContent: content,
      ...(truncated ? { truncatedSource: true } : {}),
    });
  }

  return planLesson(request, undefined);
}