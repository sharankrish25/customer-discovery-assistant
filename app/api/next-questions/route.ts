import { NextRequest, NextResponse } from "next/server";
import { callClaude, loadPrompt } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, productIdea } = body;

    if (!transcript || !productIdea) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERR", message: "Missing required fields" } },
        { status: 400 }
      );
    }

    const system = loadPrompt('questions-generator');
    const user = `Generate follow-up questions based on this customer discovery interview:

PRODUCT IDEA: ${productIdea}

TRANSCRIPT:
${transcript}

Generate 3-6 sharp, actionable follow-up questions that will help the founder make better product decisions.`;

    try {
      const response = await callClaude(system, user, {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1500,
        temperature: 0.3,
      });

      const parsed = JSON.parse(response);
      
      return NextResponse.json({
        ok: true,
        data: {
          questions: parsed.questions || [],
        },
      });
    } catch (error) {
      console.error("Next questions generation error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AI_ERR",
            message: "Failed to generate next questions",
          },
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Next questions route error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVER_ERR",
          message: "Failed to generate next questions",
        },
      },
      { status: 500 }
    );
  }
}