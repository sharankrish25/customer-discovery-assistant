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

    const { interviewId, desiredCommitment, chosenInsightTitle } = body;

    if (!interviewId || typeof interviewId !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "interviewId is required and must be a string" } },
        { status: 400 }
      );
    }

    // Get interview from store
    const interview = useStore.getState().getInterview(interviewId);

    if (!interview) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Interview not found" } },
        { status: 404 }
      );
    }

    if (!interview.insights) {
      return NextResponse.json(
        { ok: false, error: { code: "PREREQUISITE_MISSING", message: "Interview must be analyzed first (insights required)" } },
        { status: 400 }
      );
    }

    // Get customer
    const customers = useStore.getState().customers;
    const customer = customers.find((c) => c.id === interview.customerId);

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    // Find the chosen insight or pick the first pain
    let chosenInsight = interview.insights.insights.find(
      (i) => i.title === chosenInsightTitle
    );

    if (!chosenInsight) {
      // Default to first pain if no specific insight chosen
      chosenInsight =
        interview.insights.insights.find((i) => i.type === "pain") ||
        interview.insights.insights[0];
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
          name: customer.name,
          role: customer.stakeholderType,
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
