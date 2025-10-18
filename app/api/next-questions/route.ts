import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { generateQuestions } from "@/lib/questions";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "PARSE_ERR", message: "Invalid JSON in request body" } },
        { status: 400 }
      );
    }

    const { interviewId, transcript, productIdea, alignment, coaching } = body;

    if (!interviewId || typeof interviewId !== "string") {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "interviewId is required and must be a string" } },
        { status: 400 }
      );
    }

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "transcript is required and must be a string" } },
        { status: 400 }
      );
    }

    if (!productIdea || typeof productIdea !== "string") {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "productIdea is required and must be a string" } },
        { status: 400 }
      );
    }

    if (!alignment) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "PREREQUISITE_MISSING",
            message: "Interview must be analyzed first (alignment required)",
          },
        },
        { status: 400 }
      );
    }

    try {
      const betterQuestions = await generateQuestions(
        transcript,
        productIdea,
        alignment,
        coaching || null
      );

      useStore.getState().updateInterview(interviewId, {
        betterQuestions,
      });

      return NextResponse.json(
        {
          ok: true,
          data: { betterQuestions },
        },
        { status: 200 }
      );
    } catch (aiError) {
      console.error("Failed to generate follow-up questions:", aiError);
      const message =
        aiError instanceof Error ? aiError.message : "Claude could not generate follow-up questions";

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AI_ERR",
            message,
          },
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Question generation route error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate follow-up questions";

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVER_ERR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
