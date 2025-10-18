import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { generateEmail } from "@/lib/agents-advanced";
import { normalizeAIError, isRateLimitError } from "@/lib/errors";

/**
 * POST /api/followup
 *
 * Generates a follow-up email based on free-form specifications.
 *
 * Request body:
 * {
 *   "specifications": "ask to set up interview in 3 weeks, clarify insight #3",
 *   "interviewId": "interview-123",
 *   "customerName": "Sarah Chen",
 *   "customerRole": "Product Manager",
 *   "priorSummary": "Discussed feedback consolidation pain points",
 *   "insights": ["Manual process takes 3-4 hours", "Using spreadsheets"],
 *   "tone": "professional", // optional: "professional" | "friendly" | "casual"
 *   "length": "medium", // optional: "short" | "medium" | "long"
 *   "includePlaceholders": false // optional
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

    const {
      specifications,
      interviewId,
      customerName,
      customerRole,
      priorSummary,
      insights,
      tone,
      length,
      includePlaceholders,
    } = body;

    // Validate specifications
    if (!specifications || typeof specifications !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "specifications is required and must be a string",
            hint: "Provide free-form specifications like 'ask to set up interview in 3 weeks'"
          }
        },
        { status: 400 }
      );
    }

    if (specifications.trim().length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "specifications cannot be empty",
            hint: "Describe what you want in the follow-up email"
          }
        },
        { status: 400 }
      );
    }

    if (specifications.length > 2500) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "specifications exceeds maximum length of 2,500 characters",
            hint: "Please shorten your specifications"
          }
        },
        { status: 413 }
      );
    }

    // Validate prior summary length if provided
    if (priorSummary && priorSummary.length > 1000) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "priorSummary exceeds maximum length of 1,000 characters",
            hint: "Please shorten the prior summary"
          }
        },
        { status: 413 }
      );
    }

    try {
      // Generate follow-up email with retry logic built-in
      const followUpEmail = await generateEmail(specifications, {
        profile: {
          name: customerName || '[Name]',
          role: customerRole,
        },
        priorSummary,
        insights: insights || [],
        tone: tone || 'professional',
        length: length || 'medium',
        includePlaceholders: includePlaceholders ?? false,
      });

      // Update interview with follow-up email if interviewId provided
      if (interviewId) {
        useStore.getState().updateInterview(interviewId, {
          followUpEmail,
        });
      }

      return NextResponse.json({
        ok: true,
        data: { followUpEmail },
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
            hint: "Try rephrasing your specifications or reducing complexity"
          },
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error("Follow-up email route error:", error);
    const normalized = normalizeAIError(error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: normalized.code || "SERVER_ERR",
          message: "Failed to generate follow-up email",
          hint: "Please try again or contact support"
        },
      },
      { status: 500 }
    );
  }
}
