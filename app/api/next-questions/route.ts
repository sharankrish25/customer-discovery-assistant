import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { generateQuestionsMock } from "@/lib/anthropic-legacy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interviewId } = body;

    if (!interviewId) {
      return NextResponse.json(
        { error: "interviewId is required" },
        { status: 400 }
      );
    }

    // Get interview from store
    const interview = useStore.getState().getInterview(interviewId);

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    if (!interview.insights) {
      return NextResponse.json(
        { error: "Interview must be analyzed first (insights required)" },
        { status: 400 }
      );
    }

    // Call mock question generation
    const betterQuestions = await generateQuestionsMock(
      interview.productIdea,
      interview.transcript,
      interview.insights
    );

    // Update interview with question results
    useStore.getState().updateInterview(interviewId, {
      betterQuestions,
    });

    return NextResponse.json({
      success: true,
      betterQuestions,
    });
  } catch (error) {
    console.error("Question generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate follow-up questions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
