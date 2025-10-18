import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { generateEmail } from "@/lib/agents-advanced";
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

    const { interviewId, desiredCommitment, chosenInsightTitle, insights, customerName } = body;

    if (!interviewId || typeof interviewId !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "interviewId is required and must be a string" } },
        { status: 400 }
      );
    }

    if (!insights) {
      return NextResponse.json(
        { ok: false, error: { code: "PREREQUISITE_MISSING", message: "Interview must be analyzed first (insights required)" } },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "customerName is required" } },
        { status: 400 }
      );
    }

    // Find the chosen insight or pick the first pain
    let chosenInsight = insights.insights.find(
      (i: { title: string }) => i.title === chosenInsightTitle
    );

    if (!chosenInsight) {
      // Default to first pain if no specific insight chosen
      chosenInsight =
        insights.insights.find((i: { type: string }) => i.type === "pain") ||
        insights.insights[0];
    }

    if (!chosenInsight) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_INSIGHTS", message: "No insights found to reference in email" } },
        { status: 400 }
      );
    }

    // Pick the first quote from the chosen insight
    const quote = chosenInsight.quotes[0]?.text || "No specific quote available";

    try {
      // Generate follow-up email with retry logic built-in
      const followUpEmail = await generateEmail(
        {
          name: customerName,
          role: "",
        },
        {
          title: chosenInsight.title,
          quote: quote,
        },
        desiredCommitment || "15m call"
      );

      // Update interview with follow-up email
      useStore.getState().updateInterview(interviewId, {
        followUpEmail,
      });

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
        },
      },
      { status: 500 }
    );
  }
}
