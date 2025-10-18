import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { runAutoAnalysis } from "@/lib/agents";

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

    // Set status to processing
    useStore.getState().updateInterview(interviewId, {
      analysisStatus: "processing",
    });

    try {
      // Call auto-analysis (uses real Claude API or mock if no API key)
      const { summary, insights, alignment } = await runAutoAnalysis(
        interview.transcript,
        interview.productIdea
      );

      // Update interview with results
      useStore.getState().updateInterview(interviewId, {
        summary,
        insights,
        alignment,
        analysisStatus: "complete",
      });

      return NextResponse.json({
        success: true,
        summary,
        insights,
        alignment,
      });
    } catch (analysisError) {
      // Handle analysis error
      useStore.getState().updateInterview(interviewId, {
        analysisStatus: "error",
        error:
          analysisError instanceof Error
            ? analysisError.message
            : "Analysis failed",
      });

      throw analysisError;
    }
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze interview",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
