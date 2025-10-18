import { NextRequest, NextResponse } from "next/server";
import { identifySpeakers } from "@/lib/speaker-identification";
import { normalizeAIError, isRateLimitError } from "@/lib/errors";

/**
 * POST /api/annotate-speakers
 *
 * Annotates an interview transcript with speaker labels (Interviewer/Stakeholder).
 *
 * Request body:
 * {
 *   "transcript": "raw unlabeled transcript..."
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "data": {
 *     "annotated": "Interviewer: ...\nStakeholder: ...",
 *     "confidence": 0.95,
 *     "speakers": {
 *       "interviewer": 10,
 *       "stakeholder": 12
 *     }
 *   }
 * }
 */
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

    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
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
      // Call speaker identification agent
      const result = await identifySpeakers(transcript);

      return NextResponse.json({
        ok: true,
        data: result,
      }, { status: 200 });
    } catch (annotationError) {
      // Normalize AI error
      const normalized = normalizeAIError(annotationError);

      // Return user-friendly error with appropriate HTTP status
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
    console.error("Speaker annotation route error:", error);
    const normalized = normalizeAIError(error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: normalized.code || "SERVER_ERR",
          message: "Failed to annotate speakers",
        },
      },
      { status: 500 }
    );
  }
}
