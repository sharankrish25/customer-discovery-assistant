import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { analyzeQuality } from "@/lib/coaching";

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

    const { interviewId, transcript } = body;

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

    try {
      const coaching = await analyzeQuality(transcript);

      useStore.getState().updateInterview(interviewId, {
        coaching,
      });

      return NextResponse.json(
        {
          ok: true,
          data: { coaching },
        },
        { status: 200 }
      );
    } catch (aiError) {
      console.error("Failed to analyze coaching quality:", aiError);
      const message = aiError instanceof Error ? aiError.message : "Claude could not analyze the transcript";

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
    console.error("Coaching route error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate coaching feedback";

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
