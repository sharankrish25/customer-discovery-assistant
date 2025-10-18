import { NextRequest, NextResponse } from "next/server";
import { identifySpeakers } from "@/lib/speaker-identification";

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

    const { transcript } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "transcript is required and must be a string" } },
        { status: 400 }
      );
    }

    if (transcript.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "transcript cannot be empty" } },
        { status: 400 }
      );
    }

    try {
      const result = await identifySpeakers(transcript);

      return NextResponse.json(
        {
          ok: true,
          data: result,
        },
        { status: 200 }
      );
    } catch (annotationError) {
      console.error("Failed to annotate speakers:", annotationError);
      const message =
        annotationError instanceof Error
          ? annotationError.message
          : "Claude could not annotate the transcript";

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
    console.error("Speaker annotation route error:", error);
    const message = error instanceof Error ? error.message : "Failed to annotate speakers";

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
