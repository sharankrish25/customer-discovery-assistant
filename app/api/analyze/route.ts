import { NextRequest, NextResponse } from "next/server";
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

      const summarySection = summary.summary.bullets.length
        ? [`Summary:`, ...summary.summary.bullets.map((bullet) => `• ${bullet}`)].join("\n")
        : "Summary: No key bullets available.";

      const insightSection = insights.insights.length
        ? [
            "Insights:",
            ...insights.insights.map((item, index) => {
              const quote = item.quotes[0]?.text ? `"${item.quotes[0].text}"` : null;
              const reason = item.why_it_matters ? `Why it matters: ${item.why_it_matters}` : null;
              return [
                `${index + 1}. ${item.title}`,
                quote,
                reason,
              ]
                .filter(Boolean)
                .join("\n");
            }),
          ].join("\n\n")
        : "Insights: No significant patterns identified.";

      const alignmentSectionParts = [] as string[];
      if (alignment.alignment.supports.length) {
        alignmentSectionParts.push(
          ["Supports:", ...alignment.alignment.supports.map((item) => `• ${item.insight_title}`)].join("\n")
        );
      }
      if (alignment.alignment.contradicts.length) {
        alignmentSectionParts.push(
          ["Contradicts:", ...alignment.alignment.contradicts.map((item) => `• ${item.insight_title}`)].join("\n")
        );
      }
      if (alignment.alignment.neutral.length) {
        alignmentSectionParts.push(
          ["Neutral:", ...alignment.alignment.neutral.map((item) => `• ${item.insight_title}`)].join("\n")
        );
      }
      const alignmentSection = alignmentSectionParts.length
        ? ["Alignment Highlights:", alignmentSectionParts.join("\n\n")].join("\n\n")
        : "Alignment Highlights: No clear alignment signals detected.";

      const analysis = [summarySection, insightSection, alignmentSection].join("\n\n");

      return NextResponse.json({
        ok: true,
        data: {
          analysis,
        },
      }, { status: 200 });
    } catch (analysisError) {
      // Normalize AI error
      const normalized = normalizeAIError(analysisError);

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
