import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { editEmail } from "@/lib/agents-advanced";
import { normalizeAIError, isRateLimitError } from "@/lib/errors";

/**
 * POST /api/followup/edit
 *
 * Edits an existing follow-up email draft based on edit instructions.
 *
 * Request body:
 * {
 *   "draft": {
 *     "subject": "Following up on our conversation",
 *     "body": "Hi Sarah,\n\nThanks for..."
 *   },
 *   "editInstructions": "make the subject shorter and add 2 specific time slots for next week",
 *   "interviewId": "interview-123", // optional
 *   "customerName": "Sarah Chen", // optional
 *   "customerRole": "Product Manager", // optional
 *   "priorSummary": "Discussed feedback consolidation", // optional
 *   "insights": ["Manual process takes 3-4 hours"], // optional
 *   "tone": "professional", // optional
 *   "length": "medium", // optional
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
      draft,
      editInstructions,
      interviewId,
      customerName,
      customerRole,
      priorSummary,
      insights,
      tone,
      length,
      includePlaceholders,
    } = body;

    // Validate draft
    if (!draft || typeof draft !== 'object') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "draft is required and must be an object with subject and body",
            hint: "Provide the current email draft to edit"
          }
        },
        { status: 400 }
      );
    }

    if (!draft.subject || typeof draft.subject !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "draft.subject is required and must be a string",
            hint: "Provide the current email subject"
          }
        },
        { status: 400 }
      );
    }

    if (!draft.body || typeof draft.body !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "draft.body is required and must be a string",
            hint: "Provide the current email body"
          }
        },
        { status: 400 }
      );
    }

    // Validate edit instructions
    if (!editInstructions || typeof editInstructions !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "editInstructions is required and must be a string",
            hint: "Provide instructions like 'shorter subject, friendlier tone, add 2 time slots'"
          }
        },
        { status: 400 }
      );
    }

    if (editInstructions.trim().length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "editInstructions cannot be empty",
            hint: "Describe how you want to modify the email"
          }
        },
        { status: 400 }
      );
    }

    if (editInstructions.length > 2000) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "editInstructions exceeds maximum length of 2,000 characters",
            hint: "Please shorten your edit instructions"
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
      // Edit follow-up email with retry logic built-in
      const editedEmail = await editEmail(
        {
          subject: draft.subject,
          body: draft.body,
        },
        editInstructions,
        {
          profile: customerName ? {
            name: customerName,
            role: customerRole,
          } : undefined,
          priorSummary,
          insights: insights || [],
          tone: tone || 'professional',
          length: length || 'medium',
          includePlaceholders: includePlaceholders ?? false,
        }
      );

      // Update interview with edited email if interviewId provided
      if (interviewId) {
        useStore.getState().updateInterview(interviewId, {
          followUpEmail: editedEmail,
        });
      }

      return NextResponse.json({
        ok: true,
        data: { followUpEmail: editedEmail },
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
            hint: "Try rephrasing your edit instructions or simplifying the changes"
          },
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error("Follow-up email edit route error:", error);
    const normalized = normalizeAIError(error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: normalized.code || "SERVER_ERR",
          message: "Failed to edit follow-up email",
          hint: "Please try again or contact support"
        },
      },
      { status: 500 }
    );
  }
}
