import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { analyzeQuality } from "@/lib/agents-advanced";

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

    // Analyze interview quality using advanced agent
    const coaching = await analyzeQuality(interview.transcript);

    // Update interview with coaching results
    useStore.getState().updateInterview(interviewId, {
      coaching,
    });

    return NextResponse.json({
      success: true,
      coaching,
    });
  } catch (error) {
    console.error("Coaching error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate coaching feedback",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
