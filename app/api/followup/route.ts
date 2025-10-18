import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { generateEmail } from "@/lib/emails";

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

    if (!specifications || typeof specifications !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERR",
            message: "specifications is required and must be a string",
            hint: "Provide free-form specifications like 'ask to set up interview in 3 weeks'",
          },
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
            hint: "Describe what you want in the follow-up email",
          },
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
            hint: "Please shorten your specifications",
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
      const followUpEmail = await generateEmail(specifications, {
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
      });

      if (interviewId) {
        useStore.getState().updateInterview(interviewId, {
          followUpEmail,
        });
      }

      return NextResponse.json(
        {
          ok: true,
          data: { followUpEmail },
        },
        { status: 200 }
      );
    } catch (aiError) {
      console.error("Failed to generate follow-up email:", aiError);
      const message =
        aiError instanceof Error ? aiError.message : "Claude could not draft the follow-up email";

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AI_ERR",
            message,
            hint: "Try rephrasing your specifications or reducing complexity",
          },
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Follow-up email route error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate follow-up email";

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
