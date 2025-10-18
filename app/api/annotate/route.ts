import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";

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

    const system = `You are a customer discovery analyst. Create detailed annotations for interview transcripts to help founders extract maximum value from their customer conversations.

Your task: Analyze the transcript and create structured annotations that highlight:
1. Key insights and pain points
2. Emotional signals and priorities
3. Behavioral patterns and workflows
4. Assumptions that need validation
5. Follow-up opportunities

Format your response as a structured analysis with clear sections and actionable insights.`;

    const user = `Analyze this customer discovery interview and create detailed annotations:

PRODUCT IDEA: ${productIdea}

TRANSCRIPT:
${transcript}

Create a comprehensive annotation that will help the founder understand what they learned and what they should focus on next.`;

    try {
      const response = await callClaude(system, user, {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 2000,
        temperature: 0.2,
      });
      
      return NextResponse.json({
        ok: true,
        data: {
          annotation: response,
        },
      });
    } catch (error) {
      console.error("Annotation generation error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "AI_ERR",
            message: "Failed to generate annotation",
          },
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Annotation route error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SERVER_ERR",
          message: "Failed to generate annotation",
        },
      },
      { status: 500 }
    );
  }
}
