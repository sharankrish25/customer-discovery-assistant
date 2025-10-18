import { NextRequest, NextResponse } from "next/server";
import { useStore } from "@/lib/store";
import { runAutoAnalysis } from "@/lib/agents";
import { fetchInterviewForAnalysis, supabaseTranscriptFetcher } from "@/lib/interviews";
import { isSupabaseConfigured } from "@/lib/supabase";
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

    const { interviewId } = body;
    const requestTranscript = typeof body.transcript === 'string' ? body.transcript : undefined;
    const requestProductIdea = typeof body.productIdea === 'string' ? body.productIdea : undefined;

    if (!interviewId || typeof interviewId !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "interviewId is required and must be a string" } },
        { status: 400 }
      );
    }

    const supabaseEnabled = isSupabaseConfigured();
    let transcript: string | undefined;
    let productIdea: string | undefined;

    let usedSupabaseRecord = false;

    if (supabaseEnabled) {
      try {
        const record = await fetchInterviewForAnalysis(interviewId);
        transcript = record.transcript;
        productIdea = record.productIdea;
        usedSupabaseRecord = true;
      } catch (fetchError) {
        console.error(`Failed to load transcript for ${interviewId} from Supabase:`, fetchError);
      }
    }

    transcript = transcript ?? requestTranscript;
    productIdea = productIdea ?? requestProductIdea;

    const normalizedTranscript = typeof transcript === 'string' ? transcript.trim() : '';
    if (!normalizedTranscript) {
      const message = supabaseEnabled
        ? 'Transcript not found in persistence. Ensure the interview was uploaded before requesting analysis.'
        : 'transcript is required and must be a string';
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message } },
        { status: 400 }
      );
    }

    const normalizedProductIdea = typeof productIdea === 'string' ? productIdea.trim() : '';
    if (!normalizedProductIdea) {
      const message = supabaseEnabled
        ? 'Product idea missing for this interview. Save the interview details before running analysis.'
        : 'productIdea is required and must be a string';
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message } },
        { status: 400 }
      );
    }

    // Set status to processing
    useStore.getState().updateInterview(interviewId, {
      analysisStatus: "processing",
    });

    try {
      // Call auto-analysis with retry logic built-in
      const { summary, insights, alignment } = await runAutoAnalysis(
        normalizedTranscript,
        normalizedProductIdea,
        usedSupabaseRecord
          ? {
              interviewId,
              transcriptFetcher: supabaseTranscriptFetcher,
            }
          : {}
      );

      // Update interview with results
      useStore.getState().updateInterview(interviewId, {
        summary,
        insights,
        alignment,
        analysisStatus: "complete",
      });

      return NextResponse.json({
        ok: true,
        data: {
          summary,
          insights,
          alignment,
        },
      }, { status: 200 });
    } catch (analysisError) {
      // Normalize AI error
      const normalized = normalizeAIError(analysisError);

      // Update interview with error status
      useStore.getState().updateInterview(interviewId, {
        analysisStatus: "error",
        error: normalized.message,
      });

      // Return user-friendly error with appropriate HTTP status
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
    console.error("Analysis route error:", error);
    const normalized = normalizeAIError(error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: normalized.code || "SERVER_ERR",
          message: "Failed to analyze interview",
        },
      },
      { status: 500 }
    );
  }
}
