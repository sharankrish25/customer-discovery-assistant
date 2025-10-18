import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { runAutoAnalysis } from "@/lib/analysis";
import { fetchInterviewForAnalysis } from "@/lib/interviews";
import { isSupabaseConfigured } from "@/lib/supabase";

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

    const { interviewId } = body;
    const requestTranscript = typeof body.transcript === "string" ? body.transcript : undefined;
    const requestProductIdea = typeof body.productIdea === "string" ? body.productIdea : undefined;

    if (!interviewId || typeof interviewId !== "string") {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "interviewId is required and must be a string" } },
        { status: 400 }
      );
    }

    const supabaseEnabled = isSupabaseConfigured();
    let transcript: string | undefined;
    let productIdea: string | undefined;

    if (supabaseEnabled) {
      try {
        const record = await fetchInterviewForAnalysis(interviewId);
        transcript = record.transcript;
        productIdea = record.productIdea;
      } catch (fetchError) {
        console.error(`Failed to load transcript for ${interviewId} from Supabase:`, fetchError);
      }
    }

    transcript = transcript ?? requestTranscript;
    productIdea = productIdea ?? requestProductIdea;

    const normalizedTranscript = typeof transcript === "string" ? transcript.trim() : "";
    if (!normalizedTranscript) {
      const message = supabaseEnabled
        ? "Transcript not found in persistence. Ensure the interview was uploaded before requesting analysis."
        : "transcript is required and must be a string";
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message } },
        { status: 400 }
      );
    }

    const normalizedProductIdea = typeof productIdea === "string" ? productIdea.trim() : "";
    if (!normalizedProductIdea) {
      const message = supabaseEnabled
        ? "Product idea missing for this interview. Save the interview details before running analysis."
        : "productIdea is required and must be a string";
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message } },
        { status: 400 }
      );
    }

    useStore.getState().updateInterview(interviewId, {
      analysisStatus: "processing",
    });

    try {
      const { summary, insights, alignment } = await runAutoAnalysis(
        normalizedTranscript,
        normalizedProductIdea
      );

      useStore.getState().updateInterview(interviewId, {
        summary,
        insights,
        alignment,
        analysisStatus: "complete",
      });

      return NextResponse.json(
        {
          ok: true,
          data: {
            summary,
            insights,
            alignment,
          },
        },
        { status: 200 }
      );
    } catch (analysisError) {
      console.error("Failed to run interview analysis:", analysisError);
      const message =
        analysisError instanceof Error
          ? analysisError.message
          : "Claude could not process the interview";

      useStore.getState().updateInterview(interviewId, {
        analysisStatus: "error",
        error: message,
      });

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AI_ERR",
            message,
          },
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Analysis route error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze interview";

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVER_ERR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
