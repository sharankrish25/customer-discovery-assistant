import { NextRequest, NextResponse } from "next/server";
import { runAutoAnalysis } from "@/lib/agents";

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

    const { interviewId, transcript, productIdea } = body;

    if (!interviewId || typeof interviewId !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "interviewId is required and must be a string" } },
        { status: 400 }
      );
    }

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "transcript is required and must be a string" } },
        { status: 400 }
      );
    }

    if (!productIdea || typeof productIdea !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "productIdea is required and must be a string" } },
        { status: 400 }
      );
    }

    try {
      // Call auto-analysis with retry logic built-in
      const { summary, insights, alignment } = await runAutoAnalysis(
        transcript,
        productIdea,
        { interviewId }
      );

      return NextResponse.json({
        ok: true,
        data: {
          analysis: summary.summary.bullets.join('\n'), // Keep backward compatibility
          summary,
          insights,
          alignment,
        },
      }, { status: 200 });
    } catch (analysisError) {
      console.error("Analysis error:", analysisError);
      
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AI_ERR",
            message: analysisError instanceof Error ? analysisError.message : "Failed to analyze interview",
          },
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Analysis route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVER_ERR",
          message: "Failed to analyze interview",
        },
      },
      { status: 500 }
    );
  }
}