import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { generateQuestions } from "@/lib/agents-advanced";
import { normalizeAIError, isRateLimitError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
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

    if (!interviewId || typeof interviewId !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "interviewId is required and must be a string" } },
        { status: 400 }
      );
    }

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "transcript is required and must be a string" } },
        { status: 400 }
      );
    }

    if (!productIdea || typeof productIdea !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "productIdea is required and must be a string" } },
        { status: 400 }
      );
    }

    if (!alignment) {
      return NextResponse.json(
        { ok: false, error: { code: "PREREQUISITE_MISSING", message: "Interview must be analyzed first (alignment required)" } },
        { status: 400 }
      );
    }

    try {
      // Generate better questions with retry logic built-in
      const betterQuestions = await generateQuestions(
        transcript,
        productIdea,
        alignment,
        coaching || null
      );

      // Update interview with question results
      useStore.getState().updateInterview(interviewId, {
        betterQuestions,
      });

      return NextResponse.json({
        ok: true,
        data: { betterQuestions },
      }, { status: 200 });
    } catch (aiError) {
      // Normalize AI error
      const normalized = normalizeAIError(aiError);
      const statusCode = isRateLimitError(normalized) ? 429 : 502;

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: normalized.code || "AI_ERR",
            message: normalized.message,
          },
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error("Question generation route error:", error);
    const normalized = normalizeAIError(error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: normalized.code || "SERVER_ERR",
          message: "Failed to generate follow-up questions",
        },
      },
      { status: 500 }
    );
  }
}
