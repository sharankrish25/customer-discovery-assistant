import { NextRequest, NextResponse } from "next/server";
import { callClaude, loadPrompt, parseClaudeJSON } from "@/lib/anthropic";

interface CoachingHighlight {
  span_text: string;
  reason: string;
  book: string;
  suggestion: string;
  start_char: number;
  end_char: number;
}

interface CoachingAdvice {
  book: string;
  what_to_improve: string;
  example_rewrite: string;
}

interface CoachingOutput {
  highlights: CoachingHighlight[];
  advice: CoachingAdvice[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, productIdea } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "transcript is required and must be a string" },
        { status: 400 }
      );
    }

    if (!productIdea || typeof productIdea !== "string") {
      return NextResponse.json(
        { error: "productIdea is required and must be a string" },
        { status: 400 }
      );
    }

    // Load the coaching system prompt
    const systemPrompt = loadPrompt("coaching-system");

    // Build user message
    const userMessage = `
Product Idea: ${productIdea.trim()}

Transcript:
"""
${transcript.trim()}
"""

Analyze this interview transcript and provide coaching feedback following the rubric.
`.trim();

    // Call Claude
    const response = await callClaude(systemPrompt, userMessage);

    // Parse JSON response
    const coaching = parseClaudeJSON<CoachingOutput>(response);

    // Validate structure
    if (!Array.isArray(coaching.highlights) || !Array.isArray(coaching.advice)) {
      throw new Error("Invalid coaching output structure");
    }

    return NextResponse.json({
      ok: true,
      data: coaching,
    });
  } catch (error) {
    console.error("Coaching API error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate coaching feedback";

    return NextResponse.json(
      {
        ok: false,
        error: { message },
      },
      { status: 500 }
    );
  }
}
