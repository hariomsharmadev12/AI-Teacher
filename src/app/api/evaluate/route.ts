import { NextRequest, NextResponse } from "next/server";
import type { CheckpointQuestion, LearnerLevel } from "@/lib/types";
import { evaluateAnswer } from "@/lib/llm/evaluate";
import { LLMConfigError, LLMRequestError } from "@/lib/llm/client";

interface EvaluateBody {
  sectionExplanation: string;
  checkpoint: CheckpointQuestion;
  learnerAnswer: string;
  level: LearnerLevel;
}

export async function POST(req: NextRequest) {
  let body: EvaluateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (!body.sectionExplanation || !body.checkpoint || !body.learnerAnswer || !body.level) {
    return NextResponse.json({ message: "Missing fields." }, { status: 400 });
  }

  try {
    const evaluation = await evaluateAnswer(body);
    return NextResponse.json(evaluation);
  } catch (err) {
    if (err instanceof LLMConfigError) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    }
    if (err instanceof LLMRequestError) {
      console.error("Evaluation failed:", err.status, err.body);
      return NextResponse.json(
        { message: "The evaluator hit an error talking to Gemini." },
        { status: 502 }
      );
    }
    console.error("Unexpected evaluation error:", err);
    return NextResponse.json(
      { message: "Unexpected error evaluating the answer." },
      { status: 500 }
    );
  }
}