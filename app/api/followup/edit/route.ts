import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { editEmail } from "@/lib/emails";

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

    if (!draft || typeof draft !== "object") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "draft is required and must be an object with subject and body",
            hint: "Provide the current email draft to edit",
          },
        },
        { status: 400 }
      );
    }

    if (!draft.subject || typeof draft.subject !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "draft.subject is required and must be a string",
            hint: "Provide the current email subject",
          },
        },
        { status: 400 }
      );
    }

    if (!draft.body || typeof draft.body !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "draft.body is required and must be a string",
            hint: "Provide the current email body",
          },
        },
        { status: 400 }
      );
    }

    if (!editInstructions || typeof editInstructions !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "editInstructions is required and must be a string",
            hint: "Provide instructions like 'shorter subject, friendlier tone, add 2 time slots'",
          },
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
            hint: "Describe how you want to modify the email",
          },
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
            hint: "Please shorten your edit instructions",
          },
        },
        { status: 413 }
      );
    }

    if (priorSummary && priorSummary.length > 1000) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "priorSummary exceeds maximum length of 1,000 characters",
            hint: "Please shorten the prior summary",
          },
        },
        { status: 413 }
      );
    }

    try {
      const editedEmail = await editEmail(
        {
          subject: draft.subject,
          body: draft.body,
        },
        editInstructions,
        {
          profile: customerName
            ? {
                name: customerName,
                role: customerRole,
              }
            : undefined,
          priorSummary,
          insights: Array.isArray(insights) ? insights : [],
          tone: typeof tone === "string" ? tone : "professional",
          length: typeof length === "string" ? length : "medium",
          includePlaceholders: typeof includePlaceholders === "boolean" ? includePlaceholders : false,
        }
      );

      if (interviewId) {
        useStore.getState().updateInterview(interviewId, {
          followUpEmail: editedEmail,
        });
      }

      return NextResponse.json(
        {
          ok: true,
          data: { followUpEmail: editedEmail },
        },
        { status: 200 }
      );
    } catch (aiError) {
      console.error("Failed to edit follow-up email:", aiError);
      const message =
        aiError instanceof Error ? aiError.message : "Claude could not edit the follow-up email";

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AI_ERR",
            message,
            hint: "Try rephrasing your edit instructions or simplifying the changes",
          },
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Follow-up email edit route error:", error);
    const message = error instanceof Error ? error.message : "Failed to edit follow-up email";

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVER_ERR",
          message,
          hint: "Please try again or contact support",
        },
      },
      { status: 500 }
    );
  }
}
