import { NextRequest, NextResponse } from "next/server";
import type { LessonRequest } from "@/lib/types";
import { generateMoreSections } from "@/lib/llm/planner";
import { LLMConfigError, LLMRequestError } from "@/lib/llm/client";

export const runtime = "nodejs";

interface MoreSectionsBody {
  source: LessonRequest["source"];
  profile: LessonRequest["profile"];
  alreadyCovered: string[];
  // Present only for file-sourced lessons — the extracted text returned by
  // the initial /api/lessons call, resent here since the original File
  // object can't be. See extractText.ts / route.ts for where this comes from.
  content?: string;
}

export async function POST(req: NextRequest) {
  let body: MoreSectionsBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (!body.source || !body.profile || !Array.isArray(body.alreadyCovered)) {
    return NextResponse.json({ message: "Missing fields." }, { status: 400 });
  }

  const request: LessonRequest = { source: body.source, profile: body.profile };

  try {
    const sections = await generateMoreSections(request, body.alreadyCovered, body.content);
    return NextResponse.json({ sections });
  } catch (err) {
    if (err instanceof LLMConfigError) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    }
    if (err instanceof LLMRequestError) {
      console.error("More-sections generation failed:", err.status, err.body);
      return NextResponse.json(
        { message: "Couldn't reach the lesson planner for more topics." },
        { status: 502 }
      );
    }
    console.error("Unexpected more-sections error:", err);
    return NextResponse.json(
      { message: "Unexpected error generating more topics." },
      { status: 500 }
    );
  }
}