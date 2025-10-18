import { NextRequest, NextResponse } from "next/server";
import { callClaude, loadPrompt, parseClaudeJSON } from "@/lib/anthropic";

interface Question {
  text: string;
  linked_to: string;
  why: string;
  style: "past-behavior" | "quantification" | "prioritization" | "context" | "gap-filling";
}

interface QuestionsOutput {
  questions: Question[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, productIdea, analysis, coachingFeedback } = body;

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

    // Load the questions generator prompt
    const systemPrompt = loadPrompt("questions-generator");

    // Build user message with all context
    const userMessage = `
Product Idea: ${productIdea.trim()}

Interview Analysis:
${analysis || "No analysis provided yet."}

${coachingFeedback ? `Coaching Feedback:\n${JSON.stringify(coachingFeedback, null, 2)}\n` : ""}

Interview Transcript:
"""
${transcript.trim()}
"""

Generate 3-6 follow-up questions that will help validate assumptions and deepen understanding.
`.trim();

    // Call Claude
    const response = await callClaude(systemPrompt, userMessage);

    // Parse JSON response
    const questions = parseClaudeJSON<QuestionsOutput>(response);

    // Validate structure
    if (!Array.isArray(questions.questions)) {
      throw new Error("Invalid questions output structure");
    }

    // Validate we got 3-6 questions
    if (questions.questions.length < 3 || questions.questions.length > 6) {
      console.warn(`Got ${questions.questions.length} questions, expected 3-6`);
    }

    return NextResponse.json({
      ok: true,
      data: questions,
    });
  } catch (error) {
    console.error("Next questions API error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate follow-up questions";

    return NextResponse.json(
      {
        ok: false,
        error: { message },
      },
      { status: 500 }
    );
  }
}
